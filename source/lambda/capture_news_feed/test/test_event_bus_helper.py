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

import boto3
from botocore.exceptions import ClientError
from botocore.stub import Stubber
from shared_util import custom_boto_config, custom_logging
from util.event_bus_helper import ConfigEvent, publish_config


def create_expected_params(data):
    return {
        "Entries": [
            {
                "Detail": data,
                "DetailType": "config",
                "EventBusName": os.environ["EVENT_BUS_NAME"],
                "Source": os.environ["INGESTION_NAMESPACE"],
            }
        ]
    }


def create_event_data(url: str, topic=None):
    event = {
        "platform": "fakeplatform",
        "account": "fakeaccount",
        "query": "fakequery",
        "url": url,
    }

    if topic:
        event["topic"] = topic

    return json.dumps(event)


class TestEventBusHelper(unittest.TestCase):
    def setUp(self):
        self.event_bus = boto3.client("events", config=custom_boto_config.init())
        self.stubber = Stubber(self.event_bus)

    def test_stubber(self):
        event_id = "fakeeventid"
        failed_count = 0

        data = create_event_data("fakeurl.com")

        response = {
            "Entries": [{"EventId": event_id}],
            "FailedEntryCount": failed_count,
        }

        expected_params = create_expected_params(data)

        self.stubber.add_response("put_events", response, expected_params)
        self.stubber.activate()

        service_response = self.event_bus.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Source": os.environ["INGESTION_NAMESPACE"],
                    "Detail": data,
                    "DetailType": "config",
                }
            ]
        )

        self.assertEqual(service_response["Entries"][0]["EventId"], event_id)
        self.assertEqual(service_response["FailedEntryCount"], failed_count)

    def test_publish_config(self):
        event_id = "fakeeventid"
        failed_count = 0
        url_list = []

        for loop_index in range(2):
            url = f"fakeurl{loop_index}.com"
            data = create_event_data(url)

            url_list.append(url)

            expected_params = create_expected_params(data)
            response = {
                "Entries": [{"EventId": event_id}],
                "FailedEntryCount": failed_count,
            }
            self.stubber.add_response("put_events", response, expected_params)

        self.stubber.activate()

        config_event = ConfigEvent(platform="fakeplatform", account="fakeaccount", query="fakequery", url_list=url_list)
        self.assertIsNone(publish_config(config_event, event_bus=self.event_bus))

    def test_publish_config_with_topic(self):
        event_id = "fakeeventid"
        failed_count = 0
        url_list = []
        topic = "tech"

        for loop_index in range(2):
            url = f"fakeurl{loop_index}.com"
            data = create_event_data(url, topic=topic)

            url_list.append(url)

            expected_params = create_expected_params(data)
            response = {
                "Entries": [{"EventId": event_id}],
                "FailedEntryCount": failed_count,
            }
            self.stubber.add_response("put_events", response, expected_params)

        self.stubber.activate()

        config_event = ConfigEvent(
            platform="fakeplatform", account="fakeaccount", query="fakequery", url_list=url_list, topic=topic
        )
        self.assertIsNone(publish_config(config_event, event_bus=self.event_bus))

    def test_str(self):
        url_list = ["fakeurl0.com", "fakeurl1.com"]
        query = "fakequery"
        config_event = ConfigEvent(platform="fakeplatform", account="fakeaccount", query=query, url_list=url_list)

        response_str = f"Query: {query} and URLs: {url_list}"
        assert response_str == str(config_event)

    def test_no_stubber(self):
        config_event = ConfigEvent(
            platform="fakeplatform", account="fakeaccount", query="fakequery", url_list=["fakeurl5.com"]
        )
        with self.assertRaises(ClientError):
            publish_config(config_event)

    def test_publish_config_with_failures(self):
        failed_count = 1

        for loop_index in range(2):
            data = create_event_data(f"fakeurl{loop_index}.com")
            expected_params = create_expected_params(data)

            response = {"FailedEntryCount": failed_count}
            self.stubber.add_response("put_events", response, expected_params)

        self.stubber.activate()

        config_event = ConfigEvent(
            platform="fakeplatform", account="fakeaccount", query="fakequery", url_list=["fakeurl0.com", "fakeurl1.com"]
        )
        self.assertIsNone(publish_config(config_event, event_bus=self.event_bus))

    def test_fail_event_bus(self):
        url = "fakeurl4.com"
        data = create_event_data(url)

        expected_params = create_expected_params(data)
        self.stubber.add_client_error(
            "put_events",
            service_error_code="",
            service_message="",
            http_status_code=400,
            expected_params=expected_params,
        )

        self.stubber.activate()

        config_event = ConfigEvent(platform="fakeplatform", account="fakeaccount", query="fakequery", url_list=[url])
        with self.assertRaises(ClientError):
            self.assertIsNone(publish_config(config_event, event_bus=self.event_bus))

    def tearDown(self):
        self.stubber.assert_no_pending_responses()
        self.stubber.deactivate()
