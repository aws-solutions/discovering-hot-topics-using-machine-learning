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
from unittest import mock

from moto import mock_dynamodb2, mock_kinesis
from util import newscatcher_helper


def stream_setup():
    from test.test_stream_helper import stream_setup

    return stream_setup(os.environ["STREAM_NAME"])


def ddb_setup():
    table_name = os.environ["TARGET_DDB_TABLE"]
    from test.test_query_ddb_helper import ddb_setup

    dynamodb = ddb_setup(table_name)


def setup_test_case():
    stream_setup()
    ddb_setup()


class TestEventBusHelper(unittest.TestCase):
    def test_retrieve_feed(self):
        url = "nytimes.com"
        news_feed = newscatcher_helper.retrieve_feed(url)
        self.assertEqual(news_feed["url"], url)
        self.assertEqual(news_feed["language"], "en")

    def test_retrieve_feed_with_invalid_topic(self):
        with self.assertRaises(newscatcher_helper.TopicNotSupportedError):
            newscatcher_helper.retrieve_feed("nytimes.com", topic="faketopic")

    @mock.patch("util.newscatcher_helper.retrieve_feed")
    def test_retrieve_feed_from_all_topics(self, mocked_feed_call):
        url = "cnn.com"
        newscatcher_helper.retrieve_feed_from_all_topics(url)
        self.assertEqual(mocked_feed_call.call_count, len(newscatcher_helper.get_topic_list()))

    @mock_kinesis
    @mock_dynamodb2
    def test_create_and_publish_record(self):
        setup_test_case()
        news_feed = newscatcher_helper.retrieve_feed("latimes.com")
        today = datetime.now(timezone.utc)
        yesterday_timestamp = (today - timedelta(days=1)).isoformat()
        self.assertIsNone(
            newscatcher_helper.create_and_publish_record(
                news_feed,
                "fakeaccount",
                "newscatcher",
                last_published_timestamp=yesterday_timestamp,
            )
        )

    @mock_kinesis
    @mock_dynamodb2
    def test_published_date(self):
        setup_test_case()
        news_feed = newscatcher_helper.retrieve_feed("cnn.com")
        today = datetime.now(timezone.utc)
        yesterday_timestamp = (today - timedelta(days=1)).isoformat()

        for article in news_feed["articles"]:
            article.pop("published_parsed", None)

        self.assertIsNone(
            newscatcher_helper.create_and_publish_record(
                news_feed,
                "fakeaccount",
                "newscatcher",
                last_published_timestamp=yesterday_timestamp,
            )
        )

    @mock_kinesis
    @mock_dynamodb2
    def test_with_query_string(self):
        setup_test_case()
        news_feed = newscatcher_helper.retrieve_feed("cnn.com")
        today = datetime.now(timezone.utc)
        yesterday_timestamp = (today - timedelta(days=1)).isoformat()

        for article in news_feed["articles"]:
            article.pop("published_parsed", None)

        self.assertIsNone(
            newscatcher_helper.create_and_publish_record(
                news_feed,
                "fakeaccount",
                "newscatcher",
                last_published_timestamp=yesterday_timestamp,
                query_str="fakequery",
            )
        )

    def test_slice_text_into_arrays(self):
        original_text_small = "This is fake text"
        self.assertEqual(len(newscatcher_helper.slice_text_into_arrays(original_text_small)), 1)

        original_text_large_arr = []
        for i in range(300):
            original_text_large_arr.append(original_text_small)

        original_text_large = " ".join(original_text_large_arr)

        self.assertEqual(
            len(newscatcher_helper.slice_text_into_arrays(original_text_large)),
            len(original_text_large) // 1250
            if len(original_text_large) % 1250 == 0
            else 1 + len(original_text_large) // 1250,
        )
