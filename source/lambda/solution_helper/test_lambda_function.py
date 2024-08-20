######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os
import unittest
from unittest import mock

import requests

CRON_EXPRESSION = "cron(0 23 * * ? *)"

def mocked_requests_post(*args, **kwargs):
    class MockResponse:
        def __init__(self, status_code, reason):
            self.status_code = status_code
            self.reason = reason

    return MockResponse(200, "OK")


class LambdaTest(unittest.TestCase):

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
                "Region": "testregion",
                "Version": "fake-version",
                "TopicJobFreq": "cron(10 0 * * ? *)",
                "NewsFeedsIngestionEnabled": "Yes",
                "NewsFeedsIngestionFreq": CRON_EXPRESSION,
                "NewsFeedsSearchQuery": "somefakesearch",
                "YoutubeIngestionEnabled": "Yes",
                "YouTubeIngestionFreq": CRON_EXPRESSION,
                "YoutubeSearchQuery": "some fake video search",
                "YoutubeChannelId": "fakechannelid",
                "RedditIngestionEnabled": "Yes",
                "RedditIngestionFreq": CRON_EXPRESSION,
                "SubredditsToFollow": "fakesubreddit",
                "DeployCustomIngestion": "Yes"
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
                "Region": "testregion",
                "RequestType": "Create",
                "TopicJobFreq": "cron(10 0 * * ? *)",
                "NewsFeedsIngestionEnabled": "Yes",
                "NewsFeedsSearchComplexity": 1,
                "NewsFeedsSearchQueryLength": 14,
                "NewsFeedsIngestionFreq": CRON_EXPRESSION,
                "YoutubeIngestionEnabled": "Yes",
                "YouTubeIngestionFreq": CRON_EXPRESSION,
                "YouTubeChannelIDSet": "True",
                "YouTubeSearchQueryLength": 22,
                "RedditIngestionEnabled": "Yes",
                "RedditIngestionFreq": CRON_EXPRESSION,
                "RedditIngestionSubredditCount": 1,
                "CustomIngestionEnabled": "Yes"
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
