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
import boto3
from moto import mock_kinesis
import unittest
from util import stream_comment
from unittest.mock import patch
from shared_util import custom_boto_config, custom_logging

@mock_kinesis
class TestStreamComment(unittest.TestCase):
    def setUp(self):
        self.stream_name = os.environ["STREAM_NAME"]
        self.kds_client = boto3.client('kinesis', config=custom_boto_config.init()) 
        self.kds_client.create_stream(StreamName=os.environ["STREAM_NAME"], ShardCount=1)

    def tearDown(self):
        self.kds_client.delete_stream(StreamName=self.stream_name)

    @patch('praw.models.Subreddit')
    @patch('praw.models.Redditor')
    def test_publish_comment(self, redditor_mock, subreddit_mock):
        subreddit_mock.display_name = 'test_subreddit'
        redditor_mock.name = 'test_author'
        comment = {
            "_reddit": "",
            "_replies": "",
            "subreddit": subreddit_mock,
            "author": redditor_mock,
            "body": "Test text",
            "created_utc": 1689871926,
            "name": "testComment",
            "subreddit_name_prefixed": "test_subreddit_name"
        }

        stream_comment.publish_comment(comment, True)

        # To verify the data read the data from the mock stream
        response = self.kds_client.describe_stream(StreamName=self.stream_name)
        shard_id = response["StreamDescription"]["Shards"][0]["ShardId"]
        self.assertEqual(shard_id, "shardId-000000000000")
        shard_iterator = self.kds_client.get_shard_iterator(
            StreamName=self.stream_name, ShardId=shard_id, ShardIteratorType="TRIM_HORIZON"
        )
        shard_iterator = shard_iterator["ShardIterator"]
        records = self.kds_client.get_records(
            ShardIterator=shard_iterator, Limit=1)
        self.assertEqual(json.loads(records["Records"][0]["Data"])[
                         'feed']["name"], "testComment")

        subreddit_mock.display_name = 'test_subreddit'
        redditor_mock.name = 'test_author'
        comment1 = {
            "_reddit": "",
            "_replies": "",
            "subreddit": subreddit_mock,
            "author": redditor_mock,
            "body": "Test text",
            "created_utc": 1689871926,
            "name": "testComment",
            "subreddit_name_prefixed": "test_subreddit_name"
        }
        stream_comment.publish_comment(comment1, False)
        records = self.kds_client.get_records(ShardIterator=shard_iterator)
        self.assertEqual(len(records["Records"]), 1)

    @patch('praw.models.Subreddit')
    @patch('praw.models.Redditor')
    def test_publish_comment_exception(self, redditor_mock, subreddit_mock):
        subreddit_mock.display_name = 'test_subreddit'
        redditor_mock.name = 'test_author'
        comment = {
            "_reddit": "",
            "_replies": "",
            "subreddit": subreddit_mock,
            "author": redditor_mock,
            "body": "Test text",
            "created_utc": 1689871926,
            "name": "testComment",
            "subreddit_name_prefixed": "test_subreddit_name"
        }

        with patch.dict("os.environ", {"STREAM_NAME": "invalid_mock_stream"}):
            with self.assertRaises(Exception):
                stream_comment.publish_comment(comment, True)
        
