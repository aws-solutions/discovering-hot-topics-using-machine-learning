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

import json
import os
import unittest
from datetime import datetime

from moto import mock_kinesis
from shared_util.service_helper import get_service_client
from util.stream_helper import buffer_data_into_stream


@mock_kinesis
def stream_setup(stream_name):
    kds_client = get_service_client("kinesis")
    kds_client.create_stream(StreamName=stream_name, ShardCount=1)
    return kds_client


def delete_stream_setup(kds_client, stream_name):
    kds_client.delete_stream(StreamName=stream_name)


@mock_kinesis
class TestStreamBuffer(unittest.TestCase):
    def setUp(self):
        self.stream_name = os.environ["STREAM_NAME"]
        self.kds_client = stream_setup(self.stream_name)

    def tearDown(self):
        delete_stream_setup(self.kds_client, self.stream_name)

    def test_buffer_data_into_stream(self):
        data = {
            "account_name": "fakeaccount",
            "platform": "fakeplatform",
            "search_query": "query_str",
            "feed": {
                "created_at": datetime.now().timestamp(),
                "id": "fakeid",
                "id_str": "fakeid",
                "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                "entities": {"media": [{"media_url_https": "https://fakeimageurl", "type": "image/jpeg"}]},
                "extended_entities": {"media": [{"media_url_https": "https://fakeimageurl", "type": "image/jpeg"}]},
                "lang": "en",
                "metadata": {"website": "fakeurl.com", "country": "US", "topic": "faketopic"},
            },
        }

        self.assertEqual(buffer_data_into_stream(data)["ResponseMetadata"]["HTTPStatusCode"], 200)

        # To verify the data read the data from the mock stream
        response = self.kds_client.describe_stream(StreamName=self.stream_name)
        shard_id = response["StreamDescription"]["Shards"][0]["ShardId"]
        self.assertEqual(shard_id, "shardId-000000000000")
        shard_iterator = self.kds_client.get_shard_iterator(
            StreamName=self.stream_name, ShardId=shard_id, ShardIteratorType="TRIM_HORIZON"
        )
        shard_iterator = shard_iterator["ShardIterator"]
        records = self.kds_client.get_records(ShardIterator=shard_iterator, Limit=1)
        self.assertEqual(json.loads(records["Records"][0]["Data"]), data)
