######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
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
from unittest import mock

import requests


def mocked_requests_post(*args, **kwargs):
    class MockResponse:
        def __init__(self, status_code, reason):
            self.status_code = status_code
            self.reason = reason

    return MockResponse(200, "OK")


class LambdaTest(unittest.TestCase):
    def setUp(self):
        os.environ["TWITTER_SEARCH_QUERY"] = "someSearchParam"
        os.environ["TWITTER_LANG_FILTER"] = "en,fr,es,de,pt"
        os.environ["TWITTER_INGEST_FREQ"] = "cron(0/5 * * * ? *)"
        os.environ["TOPIC_JOB_FREQ"] = "cron(10 0 * * ? *)"
        os.environ["NEWSFEEDS_INGESTION_FREQ"] = "cron(0 23 * * ? *)"
        os.environ["NEWSFEEDS_SEARCH_QUERY"] = "somefakesearch"
        os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "solution/fakeID/fakeVersion" }'
        os.environ["YOUTUBE_SEARCH_QUERY"] = "some fake video search"
        os.environ["YOUTUBE_INGESTION_FREQ"] = "cron(0 23 * * ? *)"
        os.environ["YOUTUBE_CHANNEL_ID"] = "fakechannelid"

    def tearDown(self):
        del os.environ["TWITTER_SEARCH_QUERY"]
        del os.environ["TWITTER_LANG_FILTER"]
        del os.environ["TWITTER_INGEST_FREQ"]
        del os.environ["TOPIC_JOB_FREQ"]
        del os.environ["NEWSFEEDS_INGESTION_FREQ"]
        del os.environ["NEWSFEEDS_SEARCH_QUERY"]
        del os.environ["AWS_SDK_USER_AGENT"]

    def test_create_unique_id(self):
        import lambda_function

        event = {"RequestType": "Create", "ResourceProperties": {"Resource": "UUID"}}

        lambda_function.custom_resource(event, None)
        self.assertIsNotNone(lambda_function.helper.Data.get("UUID"))

    @mock.patch("requests.post", side_effect=mocked_requests_post)
    def test_send_metrics_successful(self, mock_post):
        event = {
            "RequestType": "Create",
            "ResourceProperties": {
                "Resource": "AnonymousMetric",
                "SolutionId": "SO1234",
                "UUID": "some-uuid",
                "Foo": "Bar",
                "Version": "fake-version",
            },
        }

        from lambda_function import custom_resource

        custom_resource(event, None)

        expected_metrics_endpoint = "https://metrics.awssolutionsbuilder.com/generic"
        actual_metrics_endpoint = mock_post.call_args.args[0]
        self.assertEqual(expected_metrics_endpoint, actual_metrics_endpoint)

        expected_headers = {"Content-Type": "application/json"}
        actual_headers = mock_post.call_args.kwargs["headers"]
        self.assertEqual(expected_headers, actual_headers)

        actual_payload = mock_post.call_args.kwargs["json"]
        self.assertIn("Solution", actual_payload)
        self.assertIn("UUID", actual_payload)
        self.assertIn("TimeStamp", actual_payload)
        self.assertIn("Version", actual_payload)
        self.assertIn("Data", actual_payload)
        self.assertEqual(
            actual_payload["Data"],
            {
                "Foo": "Bar",
                "RequestType": "Create",
                "TwitterSearchQueryComplexity": 1,
                "TwitterSearchQueryLength": 15,
                "TwitterLangFilter": "en,fr,es,de,pt",
                "TwitterIngestionFreq": "cron(0/5 * * * ? *)",
                "TopicJobFreq": "cron(10 0 * * ? *)",
                "NewsFeedsSearchComplexity": 1,
                "NewsFeedsSearchQueryLength": 14,
                "NewsFeedsIngestionFreq": "cron(0 23 * * ? *)",
                "YouTubIngestionFreq": "cron(0 23 * * ? *)",
                "YouTubeChannelIDSet": "True",
                "YouTubeSearchQueryLength": 22,
            },
        )

    @mock.patch("requests.post")
    def test_send_metrics_connection_error(self, mock_post):
        mock_post.side_effect = requests.exceptions.ConnectionError()

        event = {
            "RequestType": "Update",
            "ResourceProperties": {"Resource": "AnonymousMetric", "SolutionId": "SO1234", "UUID": "some-uuid"},
        }

        try:
            from lambda_function import custom_resource

            custom_resource(event, None)
        except:  # NOSONAR - python:S5754 - This is a unit test to check for exception handling
            self.fail("Exception should not be raised when metrics cannot be sent")

    @mock.patch("requests.post")
    def test_send_metrics_other_error(self, mock_post):
        try:
            invalid_event = {
                "RequestType": "Delete",
                "ResourceProperties": {"Resource": "AnonymousMetric", "UUID": "some-uuid"},
            }

            from lambda_function import custom_resource

            custom_resource(invalid_event, None)
        except:  # NOSONAR - python:S5754 - This is a unit test to check for exception handling
            self.fail("Exception should not be raised when metrics cannot be sent")

    def test_sanitize_data(self):
        from lambda_function import _sanitize_data

        resource_properties = {
            "ServiceToken": "lambda-fn-arn",
            "Resource": "AnonymousMetric",
            "SolutionId": "SO1234",
            "UUID": "some-uuid",
            "Region": "us-east-1",
            "Foo": "Bar",
        }

        expected_response = {"Region": "us-east-1", "Foo": "Bar"}

        actual_response = _sanitize_data(resource_properties)
        self.assertCountEqual(expected_response, actual_response)
