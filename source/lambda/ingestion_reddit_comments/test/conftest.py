#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os

import boto3
import pytest
from botocore.stub import Stubber
from moto import dynamodb
from shared_util import custom_boto_config


@pytest.fixture(autouse=True)
def aws_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"
    os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "solution/fakeID/fakeVersion" }'
    os.environ["TARGET_DDB_TABLE"] = "mockddbtable"
    os.environ["INGESTION_NAMESPACE"] = "com.analyze.news.config"
    os.environ["STREAM_NAME"] = "fakestream"
    os.environ["REDDIT_API_KEY"] = "fakessmapikey"
    os.environ["QUERY"] = "fakeSearch"
    os.environ["STACK_NAME"] = "testStack"
    os.environ["SOLUTION_ID"] = "testSolutionId"
    os.environ["SOLUTION_VERSION"] = "testSolutionVersion"
