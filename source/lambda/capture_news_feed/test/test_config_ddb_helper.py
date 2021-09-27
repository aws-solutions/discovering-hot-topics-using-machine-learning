#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
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
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import EndpointConnectionError
from moto import mock_dynamodb2
from shared_util import custom_boto_config, service_helper
from util import ddb_helper


@mock_dynamodb2
def ddb_setup(table_name):
    # ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
    ddb = service_helper.get_service_resource("dynamodb")
    ddb.create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "account", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "account", "AttributeType": "S"},
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )

    return ddb


@mock_dynamodb2
class TestConfigDDBHelper(unittest.TestCase):
    def setUp(self):
        self.table_name = os.environ["DDB_CONFIG_TABLE_NAME"]
        ddb = ddb_setup(self.table_name)
        self.table = ddb.Table(self.table_name)
        self.item = {"account": "testnews", "platform": "newscatcher", "query": "fakebrand", "enabled": True}

    def test_setup(self):
        self.table.put_item(Item=self.item)
        get_item_response = self.table.get_item(Key={"account": "testnews"})

        assert get_item_response["Item"] == {
            "account": "testnews",
            "platform": "newscatcher",
            "query": "fakebrand",
            "enabled": True,
        }

        scan_response = self.table.scan(FilterExpression=Attr("enabled").eq(True))
        assert scan_response["Items"] == [
            {
                "account": "testnews",
                "platform": "newscatcher",
                "query": "fakebrand",
                "enabled": 1,
            }
        ]

    def test_get_config(self):
        custom_item = self.item
        custom_item["country"] = "US"
        custom_item["language"] = "en"
        self.table.put_item(Item=custom_item)
        self.assertEqual(ddb_helper.get_config(), [custom_item])

    def test_empty_get_config(self):
        self.assertEqual(len(ddb_helper.get_config()), 0)

    def test_with_multiple_records(self):
        total_record_count = 1000
        for loop_index in range(total_record_count):
            self.table.put_item(
                Item={
                    "account": f"testnews{loop_index}",
                    "platform": "newscatcher",
                    "query": "fakebrand",
                    "enabled": True,
                }
            )
        # testing ddb pagination by setting ddb scan pagination limit as 10
        self.assertEqual(len(ddb_helper.get_config(Limit=10)), total_record_count)

    def test_with_enabled_false_records(self):
        self.table.put_item(Item=self.item)
        self.table.put_item(
            Item={"account": "testfakenews", "platform": "newscatcher", "query": "fakebrand", "enabled": False}
        )

        scan_response = self.table.scan()
        self.assertEqual(len(scan_response["Items"]), 2)

        self.assertEqual(ddb_helper.get_config(), [self.item])
        self.assertEqual(len(ddb_helper.get_config()), 1)

    def tearDown(self):
        self.table.delete()
        self.dynamodb = None
