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
import botocore
import pytest
from moto import mock_dynamodb2
from shared_util import custom_boto_config
from util import ddb_helper


@mock_dynamodb2
def ddb_setup(table_name):
    ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
    ddb.create_table(
        TableName=table_name,
        KeySchema=[{"AttributeName": "VIDEO_ID", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "VIDEO_ID", "AttributeType": "S"}],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )

    return ddb


@mock_dynamodb2
class TestQueryDDBHelper(unittest.TestCase):
    def setUp(self):
        self.table_name = os.environ["TARGET_DDB_TABLE"]
        ddb = ddb_setup(self.table_name)
        self.video_id = "fakevideoid"
        current_time = datetime.now()
        expiry_window = str(
            int(
                (current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp()
                * 1000
            )
        )
        self.item = {
            "VIDEO_ID": self.video_id,
            "LAST_QUERIED_TIMESTAMP": current_time.isoformat(),
            "EXP_DATE": {"N": expiry_window},
        }
        self.table = ddb.Table(self.table_name)
        self.table.put_item(Item=self.item)

    def tearDown(self):
        self.table.delete()
        self.dynamodb = None

    def test_update_query(self):
        self.assertIsNone(ddb_helper.update_query_timestamp(self.video_id))

    def test_get_query_timestamp(self):
        item = ddb_helper.get_query_timestamp(self.video_id)
        self.assertEqual(item, self.item)

    def test_error_update_query_when_table_not_exists(self):
        os.environ["TARGET_DDB_TABLE"] = "nonexistingmocktable"
        with self.assertRaises(Exception) as context:
            ddb_helper.update_query_timestamp(self.video_id)

        os.environ["TARGET_DDB_TABLE"] = "mockqueryddbtable"

    def test_error_update_query_when_video_id_not_exists(self):
        self.assertRaises(Exception, ddb_helper.update_query_timestamp(self.video_id))
