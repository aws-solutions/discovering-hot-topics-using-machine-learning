#!/bin/bash
#
# This script runs all tests for the root CDK project, as well as any microservices, Lambda functions, or dependency
# source code packages. These include unit tests, integration tests, and snapshot tests.
#
# This script is called by the ../initialize-repo.sh file and the buildspec.yml file. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

# Save the current working directory

source_dir=$PWD
cd $PWD

# Test the CDK project
echo "------------------------------------------------------------------------------"
echo "[Test] CDK - Discovering Hot Topics using Machine Learning App"
echo "------------------------------------------------------------------------------"
npm run clean
npm ci
npm run build
npm run test -- -u
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

# Test the attached Lambda function
echo "------------------------------------------------------------------------------"
echo "[Test] EventBridge - Firehose Topic Proxy"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/firehose_topic_proxy
rm -fr .venv-test
python3 -m venv .venv-test
echo "Initiating virtual environment"
source .venv-test/bin/activate
pip3 install -r requirements.txt --target .
pip3 install -r requirements-dev.txt
python3 -m pytest --cov --cov-report=term-missing
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
echo "deactivate virtual environment"
deactivate
rm -fr .venv-test
rm -fr coverage
rm .coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Storage - Firehose Text Proxy"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/firehose-text-proxy
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Ingestion -> Consumer"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/ingestion-consumer
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Ingestion -> Producer"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/ingestion-producer
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Storage - App Integragation Lambda"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/integration
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Solution Helper"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/solution_helper
rm -fr .venv
python3 -m venv .venv-test
echo "Initiating virtual environment"
source .venv-test/bin/activate
pip3 install -r requirements.txt --target .
pip3 install -r requirements-dev.txt
python3 -m pytest --cov --cov-report=term-missing
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
echo "deactivate virtual environment"
deactivate
rm -fr .venv-test
rm -fr coverage
rm .coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Storage - Storage Firehose Processor"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/storage-firehose-processor
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Publish Topic Model"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf_publish_topic_model
rm -fr .venv
python3 -m venv .venv-test
echo "Initiating virtual environment"
source .venv-test/bin/activate
pip3 install -r requirements.txt --target .
pip3 install -r requirements-dev.txt
python3 -m pytest --cov --cov-report=term-missing
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
echo "deactivate virtual environment"
deactivate
rm -fr .venv-test
rm -fr coverage
rm .coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Analyze Text"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-analyze-text
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage


echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Check Topic Model Job Status"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-check-topic-model
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Detect Moderation labels"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-detect-moderation-labels
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage


echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Analyze Text in Images"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-extract-text-in-image
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Publish Text Inference"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-publish-text-inference
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Storage - Submit Topic Model Job"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-submit-topic-model
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage

echo "------------------------------------------------------------------------------"
echo "[Test] Workflow - Transate Text"
echo "------------------------------------------------------------------------------"
cd $source_dir/lambda/wf-translate-text
npm run clean
npm ci
npm test
if [ "$?" = "1" ]; then
	echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
	exit 1
fi
rm -fr coverage