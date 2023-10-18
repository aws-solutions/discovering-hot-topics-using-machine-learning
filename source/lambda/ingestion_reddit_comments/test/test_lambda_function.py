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
import boto3
from moto import mock_dynamodb, mock_ssm, mock_kinesis
import unittest
import json
from unittest.mock import patch, MagicMock
from util.reddit_exception import InvalidConfigurationError
from shared_util import custom_boto_config, custom_logging
from lambda_function import handler

logger = custom_logging.get_logger(__name__)


class MockComment:
    def __init__(self):
        self.name = "testComment"
        self.author = MockAuthor()
        self._reddit = None
        self._replies = None
        self.subreddit = MockSubReddit()
        self.body = "Test comment body"
        self.created_utc = 1689871926
        self.subreddit_name_prefixed = "test_subreddit"


class MockAuthor:
    def __init__(self):
        self.name = "test_author"


class MockSubReddit:
    def __init__(self):
        self.display_name = "test_subreddit"


@mock_dynamodb
@mock_ssm
@mock_kinesis
class TestLambdaFunction(unittest.TestCase):
    def setUp(self):
        self.ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
        self.ddb.create_table(
            TableName=os.environ["TARGET_DDB_TABLE"],
            KeySchema=[
                {"AttributeName": "SUB_REDDIT", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "SUB_REDDIT", "AttributeType": "S"}
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        self.ssm_client = boto3.client('ssm', config=custom_boto_config.init())
        self.ssm_client.put_parameter(
            Name="fakessmapikey",
            Value='{"clientId":"testClientId", "clientSecret": "test_clientSecret", "refreshToken":"test_refreshToken"}',
            Type="SecureString"
        )
        self.stream_name = os.environ["STREAM_NAME"]
        self.kds_client = boto3.client(
            'kinesis', config=custom_boto_config.init())
        self.kds_client.create_stream(
            StreamName=os.environ["STREAM_NAME"], ShardCount=1)
        self.counter = 0

    def create_cw_schedule_event(self):
        return {
            "id": "fakeid",
            "detail-type": "Scheduled Event",
            "source": "aws.events",
            "account": "fakeaccount",
            "time": "1970-01-01T00:00:00Z",
            "region": "us-east-1",
            "resources": ["arn:aws:events:us-east-1:fakeaccount/FakeRule"],
            "detail": {"name": "test_subreddit"},
        }

    @patch("lambda_function.praw")
    @patch("util.stream_comment.publish_comment")
    def test_lambda_handler_empty_response(self, publish_comment_mock, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 5000

        praw_mock.Reddit.return_value.subreddit.return_value.comments.return_value = []
        handler(self.create_cw_schedule_event(), context)
        publish_comment_mock.assert_not_called()

    def test_lambda_handler_invalid_config(self):
        with patch.dict("os.environ", {"TARGET_DDB_TABLE": ""}):
            with self.assertRaises(InvalidConfigurationError):
                handler(self.create_cw_schedule_event(), None)
        with patch.dict("os.environ", {"REDDIT_API_KEY": ""}):
            with self.assertRaises(InvalidConfigurationError):
                handler(self.create_cw_schedule_event(), None)
        with patch.dict("os.environ", {"STREAM_NAME": ""}):
            with self.assertRaises(InvalidConfigurationError):
                handler(self.create_cw_schedule_event(), None)

    @patch("lambda_function.praw")
    def test_lambda_handler_success(self, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 15000

        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect
        handler(self.create_cw_schedule_event(), context)

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
        self.assertEqual(len(records["Records"]), 1)

    @patch("lambda_function.praw")
    def test_lambda_handler_success_timeout(self, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 5000

        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect
        handler(self.create_cw_schedule_event(), context)

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
        self.assertEqual(len(records["Records"]), 1)

    @patch("lambda_function.praw")
    @patch("lambda_function.publish_comment")
    def test_lambda_handler_exception(self, publish_comment_mock, praw_mock):
        self.counter = 0
        context = MagicMock()

        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect

        publish_comment_mock.side_effect = Exception('Boto3 Exception')
        with self.assertRaises(Exception):
            handler(self.create_cw_schedule_event(), context)

    @patch("lambda_function.praw")
    def test_lambda_handler_success_nocomments_with_before(self, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 15000
        self.ddb.Table(os.environ["TARGET_DDB_TABLE"]).put_item(
            Item={
                'SUB_REDDIT': 'test_subreddit',
                'before': 'test_before'
            }
        )
        self.counter = 0
        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect_reverse
        handler(self.create_cw_schedule_event(), context)

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
        self.assertEqual(len(records["Records"]), 1)

    @patch("lambda_function.praw")
    def test_lambda_handler_success_nocomments_with_before_timeout(self, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 5000
        self.ddb.Table(os.environ["TARGET_DDB_TABLE"]).put_item(
            Item={
                'SUB_REDDIT': 'test_subreddit',
                'before': 'test_before'
            }
        )
        self.counter = 0
        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect_reverse
        handler(self.create_cw_schedule_event(), context)

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
        self.assertEqual(len(records["Records"]), 1)

    @patch("lambda_function.praw")
    def test_lambda_handler_success_nocomments_with_before_reached_end(self, praw_mock):
        context = MagicMock()
        context.get_remaining_time_in_millis.return_value = 5000
        self.ddb.Table(os.environ["TARGET_DDB_TABLE"]).put_item(
            Item={
                'SUB_REDDIT': 'test_subreddit',
                'before': 'testComment'
            }
        )
        self.counter = 0
        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect_reverse
        handler(self.create_cw_schedule_event(), context)

        response = self.kds_client.describe_stream(StreamName=self.stream_name)
        shard_id = response["StreamDescription"]["Shards"][0]["ShardId"]
        shard_iterator = self.kds_client.get_shard_iterator(
            StreamName=self.stream_name, ShardId=shard_id, ShardIteratorType="TRIM_HORIZON"
        )
        shard_iterator = shard_iterator["ShardIterator"]
        records = self.kds_client.get_records(
            ShardIterator=shard_iterator, Limit=1)
        self.assertEqual(len(records["Records"]), 0)

    @patch("lambda_function.praw")
    @patch("lambda_function.publish_comment")
    def test_lambda_handler_nocomments_with_before_exception(self, publish_comment_mock, praw_mock):
        self.counter = 0
        context = MagicMock()
        self.ddb.Table(os.environ["TARGET_DDB_TABLE"]).put_item(
            Item={
                'SUB_REDDIT': 'test_subreddit',
                'before': 'test_before'
            }
        )
        praw_mock.Reddit.return_value.subreddit.return_value.comments.side_effect = self.side_effect_reverse
        publish_comment_mock.side_effect = Exception('Boto3 Exception')
        with self.assertRaises(Exception):
            handler(self.create_cw_schedule_event(), context)

    def side_effect(self, **kwargs):
        if self.counter < 2:
            self.counter += 1
            comments = []
            comment = MockComment()
            comments.append(comment)
            return comments
        else:
            self.counter += 1
            return []

    def side_effect_reverse(self, **kwargs):
        if self.counter != 0 and self.counter < 2:
            self.counter += 1
            comments = []
            comment = MockComment()
            comments.append(comment)
            return comments
        else:
            self.counter += 1
            return []
