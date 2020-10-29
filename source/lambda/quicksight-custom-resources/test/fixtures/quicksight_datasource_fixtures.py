#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICNSE-2.0                                                                     #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import logging
import pytest

import boto3
from botocore.stub import Stubber, ANY
from moto import mock_sts

from util.quicksight_application import QuicksightApplication
from util.datasource import DataSource

# import other fixutres
from test.fixtures.quicksight_test_fixture import get_quicksight_api_stubber

logger = logging.getLogger(__name__)

# globals
stubber_quicksight = None
FAKE_ACCOUNT_ID = 'FAKE_ACCOUNT'
prefix = 'DHTUT'
MOCK_VALUE = "GENERIC_MOCK_VALUE"  # 18 characters, replaced in mock steps

@pytest.fixture
def quicksight_create_and_delete_data_source_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    sub_type = 'main'
    DataSourceStubber.add_create_response(stubber_quicksight, sub_type)
    DataSourceStubber.add_delete_response(stubber_quicksight, sub_type)
    stubber_quicksight.activate()

@pytest.fixture
def quicksight_create_data_source_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    sub_type = 'main'
    DataSourceStubber.add_create_response(stubber_quicksight, sub_type)
    stubber_quicksight.activate()

@pytest.fixture
def quicksight_delete_data_source_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    sub_type = 'main'
    DataSourceStubber.add_delete_response(stubber_quicksight, sub_type)
    stubber_quicksight.activate()

class DataSourceStubber():

    @staticmethod
    def stub_create_data_source_call(sub_type):
        stubber = get_quicksight_api_stubber()
        DataSourceStubber.add_create_response(stubber, sub_type)
        stubber.activate()
        return stubber

    @staticmethod
    def stub_delete_data_source_call(sub_type):
        logger.info(f"Using stub_delete_data for {sub_type}")
        stubber = get_quicksight_api_stubber()
        DataSourceStubber.add_delete_response(stubber, sub_type)
        stubber.activate()
        return stubber

    @staticmethod
    def add_create_response(stubber, name):
        operation = 'create_data_source'
        resource_type = 'datasource'
        minimal_mock_reponse = {
            "ResponseMetadata": {
                "RequestId": "6c97c6d8-bdac-43b5-bf0a-a1bee3dbacb5",
                "HTTPStatusCode": 202,
                "HTTPHeaders": {
                    "date": "Wed, 30 Sep 2020 02:28:21 GMT",
                    "content-type": "application/json",
                    "content-length": "200",
                    "connection": "keep-alive",
                    "x-amzn-requestid": "6c97c6d8-bdac-43b5-bf0a-a1bee3dbacb5"
                },
                "RetryAttempts": 0
            },
            "Status": 202,
            "Arn": f"{MOCK_VALUE}",
            "DataSourceId": f"{MOCK_VALUE}",
            "CreationStatus": "CREATION_IN_PROGRESS",
            "RequestId": "6c97c6d8-bdac-43b5-bf0a-a1bee3dbacb5"
        }
        minimal_mock_reponse.update({"Arn": f"arn:aws:quicksight:us-east-1:{FAKE_ACCOUNT_ID}:{resource_type}/{name}"})
        minimal_mock_reponse.update({"DataSourceId": f"{name}"})

        api_params = {
            'AwsAccountId': ANY,
            'DataSourceId': ANY,
            'Name': ANY,
            'Type': 'ATHENA',
            'DataSourceParameters': ANY,
            'Permissions': ANY,
            'SslProperties': ANY
        }
        stubber.add_response(operation, minimal_mock_reponse, api_params)
        logger.debug(f"Stubber: added response for {operation} for name:{name}")

    @staticmethod
    def add_delete_response(stubber, name):
        operation = 'delete_data_source'
        resource_type = 'datasource'
        minimal_mock_reponse = {
            "ResponseMetadata": {
                "RequestId": "7123a45b-0b1f-40e5-832a-dd3b0157cbfa",
                "HTTPStatusCode": 200,
                "HTTPHeaders": {
                    "date": "Wed, 30 Sep 2020 02:42:45 GMT",
                    "content-type": "application/json",
                    "content-length": "160",
                    "connection": "keep-alive",
                    "x-amzn-requestid": "7123a45b-0b1f-40e5-832a-dd3b0157cbfa"
                },
                "RetryAttempts": 0
            },
            "Status": 200,
            "Arn": f"{MOCK_VALUE}",
            "DataSourceId": f"{MOCK_VALUE}",
            "RequestId": "7123a45b-0b1f-40e5-832a-dd3b0157cbfa"
        }
        minimal_mock_reponse.update({"Arn": f"arn:aws:quicksight:us-east-1:{FAKE_ACCOUNT_ID}:{resource_type}/{name}"})
        minimal_mock_reponse.update({"DataSourceId": f"{name}"})

        api_params = {
            'AwsAccountId': ANY,
            'DataSourceId': ANY
        }
        stubber.add_response(operation, minimal_mock_reponse, api_params)
        logger.debug(f"Stubber: added response for {operation} for name:{name}")
