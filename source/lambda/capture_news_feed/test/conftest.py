#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os

import boto3
import pytest
from botocore.stub import Stubber
from moto.dynamodb import mock_dynamodb
from shared_util import custom_boto_config


@pytest.fixture(autouse=True)
def aws_environment_variables():
    """Mocked AWS evivronment variables such as AWS credentials and region"""
    os.environ["AWS_ACCESS_KEY_ID"] = "mocked-aws-access-key-id"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mocked-aws-secret-access-key"
    os.environ["AWS_SESSION_TOKEN"] = "mocked-aws-session-token"
    os.environ["AWS_REGION"] = "us-east-1"  # must be a valid region
    os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "solution/fakeID/fakeVersion" }'
    os.environ["DDB_CONFIG_TABLE_NAME"] = "mockconfigddbtable"
    os.environ["TARGET_DDB_TABLE"] = "mockqueryddbtable"
    os.environ["EVENT_BUS_NAME"] = "fakeeventbus"
    os.environ["INGESTION_NAMESPACE"] = "com.analyze.news.config"
    os.environ["STREAM_NAME"] = "fakestream"


collect_ignore_glob = ["tests/*.py"]  # crhelper library
collect_ignore = []
