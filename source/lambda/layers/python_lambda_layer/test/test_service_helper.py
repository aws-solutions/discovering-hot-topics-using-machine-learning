######################################################################################################################
#  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      #
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

import os
import unittest

import boto3
import botocore
import mock
import pytest
from moto import mock_dynamodb2
from shared_util import custom_boto_config, service_helper


@mock_dynamodb2
def ddb_setup(table_name):
    ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
    ddb.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": "ID", "KeyType": "HASH"},
            {"AttributeName": "LAST_PUBLISHED_TIMESTAMP", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "ID", "AttributeType": "S"},
            {"AttributeName": "LAST_PUBLISHED_TIMESTAMP", "AttributeType": "S"},
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )

    return ddb


class ServiceHelperTestCase(unittest.TestCase):
    def test_service_client(self):
        service_client = service_helper.get_service_client("s3")
        self.assertIsNotNone(service_client)
        self.assertTrue("https://s3." in service_client.meta.endpoint_url)

    @mock_dynamodb2
    def test_get_service_resource(self):
        service_resource = service_helper.get_service_resource("dynamodb")
        self.assertIsNotNone(service_resource)

        table_name = os.environ["DDB_TABLE_NAME"]
        ddb_setup(table_name)
        table = service_resource.Table(table_name)
        assert table_name == table.table_name
