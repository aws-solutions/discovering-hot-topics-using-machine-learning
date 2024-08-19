#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import logging
import os
from functools import wraps

import boto3
import pytest
from botocore.stub import ANY, Stubber
from moto import mock_sts

logger = logging.getLogger(__name__)

# globals
stubber_quicksight = None
FAKE_ACCOUNT_ID = "FAKE_ACCOUNT"
FAKE_ACCOUNT_ID_SRC = "FAKE_ACCOUNT_SRC"
prefix = "SOLUTION_UT"


def dump_env():
    env = dict(os.environ)
    result_json = json.dumps(env, indent=2, sort_keys=True)
    logger.debug(
        f"dumping env json: {result_json}",
    )


def get_body():
    with open(os.path.join(os.path.dirname(__file__), "fixtures", "quicksight_data_source_test_data.json"), "r") as f:
        data = f.read()
    return data


class TestHelper:
    @staticmethod
    def get_supported_data_set_sub_types():
        # ENHANCEMENT: Should we use the config data / file for test to figure out the supported_data_set_types?
        return ["image-text", "topic", "image-moderation-label", "topic-mapping", "feed"]

    @staticmethod
    def get_resource_properties():
        resource_properties = {}
        resource_properties.update(
            {
                "StackName": os.environ.get("StackName", "MOCK_Solution_UT"),
                "QuickSightPrincipalArn": os.environ.get("QuickSightPrincipalArn", "MOCK_QuickSightPrincipalArn"),
                "QuickSightSourceTemplateArn": os.environ.get(
                    "QuickSightSourceTemplateArn", "MOCK_QuickSightSourceTemplateArn"
                ),
            },
        )
        return resource_properties

    @staticmethod
    def stubber_wrapper(fn):
        @wraps(fn)
        def wrapper(sub_type):
            stubber = get_quicksight_api_stubber()
            fn(stubber, sub_type)
            stubber.activate()
            return stubber

        return wrapper


@pytest.fixture()
def quicksight_application_resource_properties(request):
    return TestHelper.get_resource_properties()


@pytest.fixture()
def quicksight_lambda_resource_properties(request):
    import lambda_function

    resource_properties = TestHelper.get_resource_properties()
    return resource_properties


def get_quicksight_api_stubber():
    # stubber setup for pipeline
    global stubber_quicksight
    from util.helpers import get_quicksight_client

    quicksight_client = get_quicksight_client()
    if not stubber_quicksight:
        stubber_quicksight = Stubber(quicksight_client)
    return stubber_quicksight


@pytest.fixture
def quicksight_application_stub():
    class QuicksightApplicationStub:
        def __init__(self):
            self.prefix = "DHT_Unit_Test"
            self.quicksight_principal_arn = "arn:MOCK_ARN"
            self.athena_workgroup = "mock-WorkGroup"

        def get_supported_data_set_sub_types(self):
            return ["image-text", "topic", "image-moderation-label", "topic-mapping", "feed"]

    return QuicksightApplicationStub()


@pytest.fixture
def quicksight_api_stub():
    class QuickSightApiStub:
        def __init__(self):
            self.prefix = "DHT_Unit_Test"
            self.quicksight_principal_arn = "arn:MOCK_ARN"

    return QuickSightApiStub()


@pytest.fixture
def quicksight_state_all():
    from util.quicksight_application import get_global_state

    global_data = get_global_state()
    global_data.update(
        {
            "datasource": {
                "id": "DHTUT_DataSource",
                "name": "DHTUT_DataSource",
                "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:datasource/DHTUT_DataSource",
            },
            "dataset": {
                "feed": {
                    "id": "DHTUT_feed_DataSet",
                    "name": "DHTUT_feed_DataSet",
                    "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_feed_DataSet",
                },
                "image-text": {
                    "id": "DHTUT_image-text_DataSet",
                    "name": "DHTUT_image-text_DataSet",
                    "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_image-text_DataSet",
                },
                "topic": {
                    "id": "DHTUT_topic_DataSet",
                    "name": "DHTUT_topic_DataSet",
                    "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_topic_DataSet",
                },
                "image-moderation-label": {
                    "id": "DHTUT_image-moderation-label_DataSet",
                    "name": "DHTUT_image-moderation-label_DataSet",
                    "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_image-moderation-label_DataSet",
                },
                "tweet": {
                    "id": "DHTUT_topic-mapping_DataSet",
                    "name": "DHTUT_topic-mapping_DataSet",
                    "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_topic-mapping_DataSet",
                },
            },
        }
    )
