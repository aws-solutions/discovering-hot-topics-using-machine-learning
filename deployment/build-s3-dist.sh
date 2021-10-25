#!/bin/bash
#
# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'cdk synth' output into solution assets.
#   3. Build and synthesize your CDK project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files used for staging.
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code template-bucket-name
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package

[ "$DEBUG" == 'true' ] && set -x
set -e

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ] || [ -z "$6" ]; then
    echo "Please provide all required parameters for the build script"
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.2.0 template-bucket-name template_account_id solutions"
    exit 1
fi

bucket_name="$1"
solution_name="$2"
solution_version="$3"
template_bucket_name="$4"
template_account_id="$5"
dist_quicksight_namespace="$6"

dashed_version="${solution_version//./$'_'}"

# Get reference for all important folders
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Remove any old dist files from previous runs"
echo "------------------------------------------------------------------------------"
rm -rf $template_dist_dir
mkdir -p $template_dist_dir

rm -rf $build_dist_dir
mkdir -p $build_dist_dir

rm -rf $staging_dist_dir
mkdir -p $staging_dist_dir

echo "------------------------------------------------------------------------------"
echo "[Init] Install dependencies for the cdk-solution-helper"
echo "------------------------------------------------------------------------------"
cd $template_dir/cdk-solution-helper
npm ci --only=prod

echo "------------------------------------------------------------------------------"
echo "[Init] Install dependencies for Lambda functions"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda
for folder in */ ; do
    cd "$folder"

    function_name=${PWD##*/}
    echo "Installing dependencies for $function_name"

    for temp_folder in ".nyc_output" ".venv-prod" ".venv-test" "__pycache__"; do
        if [ -d "$temp_folder" ]; then
            echo "$temp_folder exists, removing it"
            rm -rf $temp_folder
        fi
    done

    if [ -e "requirements.txt" ]; then
        if [ "$function_name" = "capture_news_feed" ]; then
            echo "Installing $function_name lambda using virtual environment"
            python3 -m venv .venv-test
            echo "Activating virtual environment"
            source .venv-test/bin/activate
            echo "Executing pip3 install -q -r requirements.txt --upgrade --target ./"
            pip3 install -q -r requirements.txt --upgrade --target ./
            echo "Deactivating virtual environment"
            deactivate
            echo "Deleting python virtual environment"
            rm -fr .venv-test
        else
            echo "Installing $function_name lambda"
            echo "Executing pip3 install -q -r requirements.txt --upgrade --target ./"
            pip3 install -q -r requirements.txt --upgrade --target ./
        fi
    elif [ -e "package.json" ]; then
        echo "Installing node dependencies"
        echo "Executing npm ci --only=prod"
        npm ci --only=prod
    fi

    cd ..
done

echo "------------------------------------------------------------------------------"
echo "[Synth] CDK Project"
echo "------------------------------------------------------------------------------"
cd $source_dir

# Important: CDK global version number
cdk_version=$(node ../deployment/get-cdk-version.js) # Note: grabs from node_modules/aws-cdk/package.json

echo "------------------------------------------------------------------------------"
echo "[Install] Installing CDK $cdk_version"
echo "------------------------------------------------------------------------------"

npm install aws-cdk@$cdk_version

## Option to suppress the Override Warning messages while synthesizing using CDK
export overrideWarningsEnabled=false
echo "setting override warning to $overrideWarningsEnabled"

node_modules/aws-cdk/bin/cdk synth --output=$staging_dist_dir

cd $staging_dist_dir
rm tree.json manifest.json cdk.out

echo "------------------------------------------------------------------------------"
echo "[Packing] Template artifacts"
echo "------------------------------------------------------------------------------"
cp $staging_dist_dir/*.template.json $template_dist_dir/
rm *.template.json

for f in $template_dist_dir/*.template.json; do
    mv -- "$f" "${f%.template.json}.template"
done

node $template_dir/cdk-solution-helper/index

echo "------------------------------------------------------------------------------"
echo "Updating placeholders"
echo "------------------------------------------------------------------------------"
for file in $template_dist_dir/*.template
do
    replace="s/%%BUCKET_NAME%%/$bucket_name/g"
    sed -i -e $replace $file

    replace="s/%%SOLUTION_NAME%%/$solution_name/g"
    sed -i -e $replace $file

    replace="s/%%VERSION%%/$solution_version/g"
    sed -i -e $replace $file

    replace="s/%%TEMPLATE_BUCKET_NAME%%/$template_bucket_name/g"
    sed -i -e $replace $file

    replace="s/%%TEMPLATE_ACCOUNT_ID%%/$template_account_id/g"
    sed -i -e $replace $file

    replace="s/%%DIST_QUICKSIGHT_NAMESPACE%%/$dist_quicksight_namespace/g"
    sed -i -e $replace $file

    replace="s/%%DASHED_VERSION%%/$dashed_version/g"
    sed -i -e $replace $file
done

echo "------------------------------------------------------------------------------"
echo "[Packing] Source code artifacts"
echo "------------------------------------------------------------------------------"
# ... For each asset.* source code artifact in the temporary /staging folder...
cd $staging_dist_dir
for d in `find . -mindepth 1 -maxdepth 1 -type d`; do
    # Rename the artifact, removing the period for handler compatibility
    pfname="$(basename -- $d)"
    fname="$(echo $pfname | sed -e 's/\.//g')"
    mv $d $fname

    # Zip artifacts from asset folder
    cd $fname
    zip -r ../$fname.zip *
    cd ..

    # Copy the zipped artifact from /staging to /regional-s3-assets
    cp $fname.zip $build_dist_dir

    # Remove the old artifacts from /staging
    rm -rf $fname
    rm $fname.zip
done

echo "------------------------------------------------------------------------------"
echo "[Cleanup] Remove temporary files"
echo "------------------------------------------------------------------------------"
rm -rf $staging_dist_dir
