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
from datetime import datetime, timedelta, timezone

import boto3
from moto import mock_dynamodb2
from shared_util import custom_boto_config
from util import ddb_helper


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


@mock_dynamodb2
class TestQueryDDBHelper(unittest.TestCase):
    def setUp(self):
        self.table_name = os.environ["TARGET_DDB_TABLE"]
        ddb = ddb_setup(self.table_name)
        self.record_id = "testnews#fakeurl.com#fakebrand"
        self.item = {
            "ID": self.record_id,
            "platform": "newscatcher",
            "LAST_PUBLISHED_TIMESTAMP": "fake123456789",
        }
        self.table = ddb.Table(self.table_name)
        self.table.put_item(Item=self.item)

    def tearDown(self):
        self.table.delete()
        self.dynamodb = None

    def test_update_query(self):
        new_item = {"ID": self.record_id, "LAST_PUBLISHED_TIMESTAMP": "fake123456791", "platform": "newscatcher"}
        self.assertIsNone(ddb_helper.update_query(new_item))

    def test_update_query_tracker(self):
        self.assertIsNone(ddb_helper.update_query_tracker("url_params", "cnn.com", "fakequery", topic="news"))

    def test_get_query_tracker(self):
        account = "testnews"
        url = "fakeurl.com"
        search_query = "fakebrand"
        self.assertEqual(
            ddb_helper.get_query_tracker(account, url, search_query),
            self.item,
        )

        new_item = {"ID": self.record_id, "LAST_PUBLISHED_TIMESTAMP": "fake123456791", "platform": "newscatcher"}
        ddb_helper.update_query(new_item)
        self.assertEqual(
            ddb_helper.get_query_tracker(account, url, search_query),
            new_item,
        )

        topic = "tech"

        item_with_topic = {
            "ID": f"{account}#{url}#{topic}#{search_query}",
            "LAST_PUBLISHED_TIMESTAMP": "fake123456792",
            "plaform": "newscatcher",
        }
        ddb_helper.update_query(item_with_topic)
        self.assertEqual(ddb_helper.get_query_tracker(account, url, search_query, topic=topic), item_with_topic)

    def test_empty_query_tracker_throw_error(self):
        self.table.delete_item(Key=self.item)
        # Using 5 seconds as an approx lead time for the response to return. The value datetime is calcuated within the function
        self.assertTrue(
            datetime.fromisoformat(
                ddb_helper.get_query_tracker("testnews", "fakeurl.com", "fakebrand")["LAST_PUBLISHED_TIMESTAMP"]
            )
            - (datetime.now(timezone.utc) - timedelta(days=30))
            < timedelta(seconds=5)
        )
