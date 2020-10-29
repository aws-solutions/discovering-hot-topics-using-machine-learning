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

import json
import logging
import os

import pytest
import boto3
from botocore.stub import Stubber, ANY
from moto import mock_sts


logger = logging.getLogger(__name__)

# globals
stubber_quicksight = None
FAKE_ACCOUNT_ID = 'FAKE_ACCOUNT'
FAKE_ACCOUNT_ID_SRC = 'FAKE_ACCOUNT_SRC'
prefix = 'SOLUTION_UT'

def dump_env():
    env = dict(os.environ)
    result_json = json.dumps(env, indent=2, sort_keys=True)
    logger.debug(f'dumping env json: {result_json}',)

def get_body():
    with open(os.path.join(os.path.dirname(__file__), 'fixtures','quicksight_data_source_test_data.json'), 'r') as f:
        data = f.read()
    return data

class TestHelper:
    @staticmethod
    def get_supported_data_set_sub_types():
        # ENHANCEMENT: Should we use the config data / file for test to figure out the supported_data_set_types?
        return ['sentiment', 'image-text', 'text', 'topic']

@pytest.fixture()
def quicksight_application_resource_properties(request):
    resource_properties = {}
    resource_properties.update({'ConfigDataFile': 'util/config/config.yaml'})
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
            self.athena_workgroup = 'mock-WorkGroup'

        def get_supported_data_set_sub_types(self):
            return ['sentiment', 'image-text', 'text', 'topic']

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
    global_data.update({
        'datasource': {
            "id": "DHTUT_DataSource",
            "name": "DHTUT_DataSource",
            "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:datasource/DHTUT_DataSource"
        },
        'dataset': {
            'sentiment': {
                "id": "DHTUT_sentiment_DataSet",
                "name": "DHTUT_sentiment_DataSet",
                "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_sentiment_DataSet"
            },
            'image-text': {
                "id": "DHTUT_image-text_DataSet",
                "name": "DHTUT_image-text_DataSet",
                "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_image-text_DataSet"
            },
            'text': {
                "id": "DHTUT_text_DataSet",
                "name": "DHTUT_text_DataSet",
                "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_text_DataSet"
            },
            'topic': {
                "id": "DHTUT_topic_DataSet",
                "name": "DHTUT_topic_DataSet",
                "arn": "arn:aws:quicksight:us-east-1:FAKE_ACCOUNT:dataset/DHT_topic_DataSet"
            }

        }
    })
