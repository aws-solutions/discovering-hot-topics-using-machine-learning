#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed underthe Apache License, Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import os
from unittest import TestCase, mock

from test.lambda_events import xls_file_upload_event
from test.test_s3_util import s3_setup, s3_tear_down

import boto3
import lambda_function
from moto import mock_kinesis, mock_s3
from shared_util import custom_boto_config, service_helper
from file_processor.file_processor import (
    ACCOUNT_NAME,
    CREATED_DATE,
    ID,
    LANG,
    PLATFORM,
    TEXT,
)


@mock_kinesis
def stream_setup(stream_name):
    kds_client = service_helper.get_service_client("kinesis")
    kds_client.create_stream(StreamName=stream_name, ShardCount=1)
    return kds_client


def stream_tear_down(stream_name):
    kds_client = service_helper.get_service_client("kinesis")
    kds_client.delete_stream(StreamName=stream_name)


@mock_s3
@mock_kinesis
class TestLambda(TestCase):
    def setUp(self):
        s3_setup()
        stream_setup(os.environ["STREAM_NAME"])

    def test_lambda_happy_path(self):
        with mock.patch.dict(
            os.environ,
            {ID: "0", CREATED_DATE: "1", TEXT: "2", LANG: "3", ACCOUNT_NAME: "test_account", PLATFORM: "test_platform"},
        ):
            lambda_function.handler(xls_file_upload_event, None)

    def tearDown(self):
        s3_tear_down()
        stream_tear_down(os.environ["STREAM_NAME"])
