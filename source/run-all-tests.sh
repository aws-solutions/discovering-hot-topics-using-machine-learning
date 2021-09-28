#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      			 #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################


# This script runs all tests for the root CDK project, as well as any microservices, Lambda functions, or dependency
# source code packages. These include unit tests, integration tests, and snapshot tests.
#
# This script is called by the ../initialize-repo.sh file and the buildspec.yml file. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

[ "$DEBUG" == 'true' ] && set -x
set -e

setup_python_env() {
	if [ -d "./.venv-test" ]; then
		echo "Reusing already setup python venv in ./.venv-test. Delete ./.venv-test if you want a fresh one created."
		return
	fi
	echo "Setting up python venv"
	python3 -m venv .venv-test
	echo "Initiating virtual environment"
	source .venv-test/bin/activate
	echo "Installing python packages"
	pip3 install -r requirements.txt --target .
	pip3 install -r requirements-dev.txt
	pip3 install $source_dir/lambda/layers/python_lambda_layer # This is required so that libraries under lambda layers are available to unit test lambda functions
	echo "deactivate virtual environment"
	deactivate
}

run_python_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && rm -fr .venv-test

	setup_python_env

	echo "Initiating virtual environment"
	source .venv-test/bin/activate

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$lambda_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	python3 -m pytest --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path
	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		rm -fr .venv-test
		# Note: leaving $source_dir/test/coverage-reports to allow further processing of coverage reports
		rm -fr coverage
		rm .coverage
	fi
}

run_javascript_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Javascript Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm test
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
    [ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
    mkdir -p $source_dir/test/coverage-reports/jest/$lambda_name
    coverage_report_path=$source_dir/test/coverage-reports/jest/$lambda_name
    rm -fr $coverage_report_path
    mv coverage $coverage_report_path
}

run_cdk_project_test() {
	component_description=$1
    component_name=solutions-constructs
	echo "------------------------------------------------------------------------------"
	echo "[Test] $component_description"
	echo "------------------------------------------------------------------------------"
	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm run build

	## Option to suppress the Override Warning messages while synthesizing using CDK
	# Suppressing this as the warnings do not handle cdk.Duration type well and throw an exception
	export overrideWarningsEnabled=false
	echo "setting override warning to $overrideWarningsEnabled"

	npm run test -- -u
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
    [ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
    mkdir -p $source_dir/test/coverage-reports/jest
    coverage_report_path=$source_dir/test/coverage-reports/jest/$component_name
    rm -fr $coverage_report_path
    mv coverage $coverage_report_path

	# Unsetting the set variable to suppress warnings
	unset overrideWarningsEnabled
}


# Save the current working directory and set source directory
source_dir=$PWD
cd $source_dir

# Option to clean or not clean the unit test environment before and after running tests.
# The environment variable CLEAN has default of 'true' and can be overwritten by caller
# by setting it to 'false'. Particularly,
#    $ CLEAN=false ./run-all-tests.sh
#
CLEAN="${CLEAN:-true}"

#
# Test the CDK project
#
run_cdk_project_test "CDK - Discovering Hot Topics using Machine Learning App"

#
# Test the attached Lambda functions
#
run_python_lambda_test layers/python_lambda_layer "Lambda Python Layer - Custom botocore config Initiatlization"

run_javascript_lambda_test layers/aws-nodesdk-custom-config "Lambda Nodejs Layer - Custom config initialization"

run_python_lambda_test capture_news_feed "Ingestion - newscatcher"

run_javascript_lambda_test create-partition "create-partition"

run_python_lambda_test firehose_topic_proxy "EventBridge - Firehose Topic Proxy"

run_javascript_lambda_test firehose-text-proxy "Storage - Firehose Text Proxy"

run_javascript_lambda_test ingestion-consumer "Ingestion - Consumer"

run_javascript_lambda_test ingestion-producer "Ingestion - Producer"

run_python_lambda_test ingestion-youtube "Ingestion - Youtube"

run_javascript_lambda_test integration "Storage - App Integragation Lambda"

run_python_lambda_test solution_helper "Solution Helper"

run_javascript_lambda_test storage-firehose-processor "Storage - Storage Firehose Processor"

run_python_lambda_test wf_publish_topic_model "Workflow - Publish Topic Model"

run_javascript_lambda_test wf-analyze-text "Workflow - Analyze Text"

run_javascript_lambda_test wf-check-topic-model "Workflow - Check Topic Model Job Status"

run_javascript_lambda_test wf-detect-moderation-labels "Workflow - Detect Moderation labels"

run_javascript_lambda_test wf-extract-text-in-image "Workflow - Analyze Text in Images"

run_javascript_lambda_test wf-publish-text-inference "Workflow - Publish Text Inference"

run_javascript_lambda_test wf-submit-topic-model "Storage - Submit Topic Model Job"

run_javascript_lambda_test wf-translate-text "Workflow - Transate Text"

run_python_lambda_test quicksight-custom-resources "Quicksight - Custom Resources"

run_javascript_lambda_test wf-detect-language "Workflow - Detect Language"

# Return to the source/ level where we started
cd $source_dir