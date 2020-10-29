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

from util.quicksight import QuicksightApi
from util.quicksight_application import QuicksightApplication

# import other fixutres
from test.fixtures.quicksight_test_fixture import get_quicksight_api_stubber
from test.fixtures.quicksight_test_fixture import TestHelper

logger = logging.getLogger(__name__)

# globals
stubber_quicksight = None
FAKE_ACCOUNT_ID = 'FAKE_ACCOUNT'


@pytest.fixture()
def mininmal_data_sets_stub(request):
    class GenericTestStub():
        pass

    # stubs
    quicksight_applictation_stub = GenericTestStub()
    quicksight_applictation_stub.prefix = "SOLUTION_UT"
    quicksight_applictation_stub.quicksight_principal_arn = "arn:MOCK_ARN"

    # stub datasets
    data_sets_stub = dict()
    for data_set_type in TestHelper.get_supported_data_set_sub_types():
        data_set = GenericTestStub()
        data_set.arn = f'Stub_{data_set_type}_arn'
        data_set.name = f'Stub_{data_set_type}_name'
        data_sets_stub[data_set_type] = data_set

    quicksight_applictation_stub.data_sets = data_sets_stub

    class MinimalDataSetsStub():
        def __init__(self, quicksight_applictation_stub, data_sets_stub):
            self.quicksight_applictation_stub = quicksight_applictation_stub
            self.data_sets_stub = data_sets_stub

    stub = MinimalDataSetsStub(quicksight_applictation_stub, data_sets_stub)
    return stub

@pytest.fixture(params=TestHelper.get_supported_data_set_sub_types())
def data_set_type(request):
    param = request.param
    yield param

@pytest.fixture
def quicksight_data_set_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    DataSetStubber.add_create_data_sets_responses(stubber_quicksight)
    DataSetStubber.add_delete_data_sets_responses(stubber_quicksight)
    stubber_quicksight.activate()

@pytest.fixture
def quicksight_create_data_set_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    DataSetStubber.add_create_data_sets_responses(stubber_quicksight)
    stubber_quicksight.activate()

@pytest.fixture
def quicksight_delete_data_set_stubber():
    stubber_quicksight = get_quicksight_api_stubber()
    DataSetStubber.add_delete_data_sets_responses(stubber_quicksight)
    stubber_quicksight.activate()

class DataSetStubber():
    @staticmethod
    def stub_create_data_set(data_set_type):
        stubber = get_quicksight_api_stubber()
        DataSetStubber.add_create_data_set_response(stubber, data_set_type)
        stubber.activate()
        return stubber

    @staticmethod
    def stub_delete_data_set(data_set_type):
        logger.info(f"Using stub_delete_data for {data_set_type}")
        stubber = get_quicksight_api_stubber()
        DataSetStubber.add_delete_data_set_response(stubber, data_set_type)
        stubber.activate()

    @staticmethod
    def add_create_data_set_response(stubber, name):
        operation = 'create_data_set'
        resource_type = 'dataset'
        minimal_mock_reponse = {
            "ResponseMetadata": {
                "RequestId": "04ebc665-35ce-4dab-b678-24a0eb782d86",
                "HTTPStatusCode": 201,
                "HTTPHeaders": {
                    "date": "Wed, 30 Sep 2020 19:32:29 GMT",
                    "content-type": "application/json",
                    "content-length": "223",
                    "connection": "keep-alive",
                    "x-amzn-requestid": "04ebc665-35ce-4dab-b678-24a0eb782d86"
                },
                "RetryAttempts": 0
            },
            "Status": 201,
            "Arn": f"arn:aws:quicksight:us-east-1:{FAKE_ACCOUNT_ID}:{resource_type}/{name}",
            "DataSetId": f"{name}",
            "RequestId": "04ebc665-35ce-4dab-b678-24a0eb782d86"
        }
        api_params = {
            'AwsAccountId': ANY,
            'DataSetId': ANY,
            'Name': ANY,
            'ImportMode': ANY,
            'LogicalTableMap': ANY,
            'PhysicalTableMap': ANY,
            'Permissions': ANY
        }
        stubber.add_response(operation, minimal_mock_reponse, api_params)
        logger.debug(f"Stubber: added response for {operation} for name:{name}")

    @staticmethod
    def add_delete_data_set_response(stubber, name):
        operation = 'delete_data_set'
        resource_type = 'dataset'

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
            "Arn": f"arn:aws:quicksight:us-east-1:{FAKE_ACCOUNT_ID}:{resource_type}/{name}",
            "DataSetId": f"name",
            "RequestId": "7123a45b-0b1f-40e5-832a-dd3b0157cbfa"
        }
        api_params = {
            'AwsAccountId': ANY,
            'DataSetId': ANY
        }
        stubber.add_response(operation, minimal_mock_reponse, api_params)
        logger.debug(f"Stubber: added response for {operation} for name:{name}")

    @staticmethod
    def add_create_data_sets_responses(stubber):
        for data_set_type in TestHelper.get_supported_data_set_sub_types():
            DataSetStubber.add_create_data_set_response(stubber, data_set_type)

    @staticmethod
    def add_delete_data_sets_responses(stubber):
        for data_set_type in TestHelper.get_supported_data_set_sub_types():
            DataSetStubber.add_delete_data_set_response(stubber, data_set_type)
