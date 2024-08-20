#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os
import boto3
from moto import mock_dynamodb, mock_ssm
import unittest
from unittest.mock import patch
from util import reddit_util
from util.reddit_exception import InvalidConfigurationError
from shared_util import custom_boto_config, custom_logging

logger = custom_logging.get_logger(__name__)


@mock_dynamodb
@mock_ssm
class TestStreamComment(unittest.TestCase):

    def setUp(self):
        ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
        ddb.create_table(
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

        self.ssm_client = boto3.client("ssm", config=custom_boto_config.init())

    def test_get_and_update_tracker_state(self):
        before = reddit_util.get_tracker_state("test_sub_reddit")
        self.assertIsNone(before)

        reddit_util.update_tracker_state("test_sub_reddit", "test_comment_id")
        before = reddit_util.get_tracker_state("test_sub_reddit")
        self.assertEqual(before, "test_comment_id")

    @patch("shared_util.service_helper.get_service_resource")
    def test_tracker_state_exception(self, service_resource_mock):
        service_resource_mock.return_value.Table.return_value.query.side_effect = Exception('Boto3 Exception')
        with self.assertRaises(Exception):
            reddit_util.get_tracker_state("test_sub_reddit")
        service_resource_mock.return_value.Table.return_value.put_item.side_effect = Exception('Boto3 Exception')
        with self.assertRaises(Exception):
            reddit_util.update_tracker_state("test_sub_reddit", "test_comment_id")

    def test_get_reddit_credentials(self):

        api_key = '{"clientId":"testClientId", "clientSecret": "test_clientSecret", "refreshToken":"test_refreshToken"}'
        self.ssm_client.put_parameter(Name=os.environ["REDDIT_API_KEY"], Type="SecureString", Value=api_key)
        reddit_creds = reddit_util.get_reddit_credentials()
        self.assertEqual(reddit_creds['clientId'], 'testClientId')
        self.assertEqual(reddit_creds['clientSecret'], 'test_clientSecret')
        self.assertEqual(reddit_creds['refreshToken'], 'test_refreshToken')
        
        api_key = '{"clientId":"testClientId", "clientSecret": "test_clientSecret"}'
        self.ssm_client.put_parameter(Name=os.environ["REDDIT_API_KEY"], Type="SecureString", Value=api_key, Overwrite=True)
        with self.assertRaises(InvalidConfigurationError):
            reddit_util.get_reddit_credentials()
