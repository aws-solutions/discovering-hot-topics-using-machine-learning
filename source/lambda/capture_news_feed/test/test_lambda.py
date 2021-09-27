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
from functools import wraps
from test.fixtures.event_bus_fixture import get_event_bus_stubber
from test.test_stream_helper import stream_setup

import boto3
import mock
import pytest
from botocore import stub
from moto import mock_dynamodb2, mock_kinesis, mock_sts
from shared_util import custom_boto_config


def create_event_data_for_ddb(url: str):
    return json.dumps(
        {
            "platform": "fakeplatform",
            "account": "fakeaccount",
            "query": "fakequery",
            "url": url,
        }
    )


def create_event_data_for_json_str(url: str):
    return json.dumps(
        {
            "platform": "newsfeeds",
            "account": "url_params",
            "query": "fakequery",
            "url": url,
        }
    )


def create_cw_schedule_event():
    return {
        "id": "fakeid",
        "detail-type": "Scheduled Event",
        "source": "aws.events",
        "account": "fakeaccount",
        "time": "1970-01-01T00:00:00Z",
        "region": "us-east-1",
        "resources": ["arn:aws:events:us-east-1:fakeaccount/FakeRule"],
        "detail": {},
    }


def create_event_bus_consumer_event():
    return {
        "version": "0",
        "id": "fakeID",
        "detail-type": "newscatcher",
        "source": os.environ["INGESTION_NAMESPACE"],
        "account": "fakeAccountID",
        "time": "2020-06-13T23:14:19Z",
        "region": "us-east-1",
        "detail": {
            "platform": "newsfeeds",
            "account": "url_params",
            "search_query": "fakequery",
            "url": "cnn.com",
        },
    }


def create_event_bus_mocked_response():
    # setting up event bus
    event_id = "fakeeventid"
    failed_count = 0
    return {
        "Entries": [{"EventId": event_id}],
        "FailedEntryCount": failed_count,
    }


def create_kinesis_streams():
    stream_setup(os.environ["STREAM_NAME"])


def created_ddb_for_tracker():
    table_name = os.environ["TARGET_DDB_TABLE"]
    from test.test_query_ddb_helper import ddb_setup

    dynamodb = ddb_setup(table_name)


def create_ddb_table_for_US_en():
    # setting up ddb
    table_name = os.environ["DDB_CONFIG_TABLE_NAME"]

    from test.test_config_ddb_helper import ddb_setup

    dynamodb = ddb_setup(table_name)
    table = dynamodb.Table(table_name)
    item = {
        "account": "fakeaccount",
        "platform": "fakeplatform",
        "query": "fakequery",
        "enabled": True,
        "country": "US",
        "language": "en",
    }
    table.put_item(Item=item)
    return dynamodb


def get_news_sites_for_US_en():
    return [
        "cnn.com",
        "reuters.com",
        "wsj.com",
        "washingtonpost.com",
        "usatoday.com",
        "wired.com",
        "cnbc.com",
        "digg.com",
        "cbsnews.com",
        "theverge.com",
        "mashable.com",
        "foxnews.com",
        "engadget.com",
        "nbcnews.com",
        "fortune.com",
        "aljazeera.com",
        "thedailybeast.com",
        "nymag.com",
        "techradar.com",
        "washingtontimes.com",
        "msnbc.com",
        "denverpost.com",
        "ew.com",
        "ycombinator.com",
        "breitbart.com",
        "bleacherreport.com",
        "propublica.org",
        "nationalreview.com",
        "axios.com",
        "alternet.org",
        "dailydot.com",
        "dailycaller.com",
        "democracynow.org",
        "heavy.com",
        "newser.com",
        "firstcoastnews.com",
        "mintpressnews.com",
        "goodnewsnetwork.org",
        "thegrio.com",
        "pantagraph.com",
        "pjstar.com",
        "dailyvoice.com",
        "ctmirror.org",
        "newsy.com",
        "conservativereview.com",
    ]


def lambda_event_bus_event():
    return {
        "version": "0",
        "id": "fakeid",
        "detail-type": "config",
        "source": os.environ["INGESTION_NAMESPACE"],
        "account": "FAKEACCOUNT",
        "time": "2020-06-24T17:16:02Z",
        "region": "us-west-2",
        "resources": [],
        "detail": {},
    }


@mock_sts
@mock_dynamodb2
def test_invoke_lambda_for_ddb_config(get_event_bus_stubber):
    lambda_event = create_cw_schedule_event()
    create_ddb_table_for_US_en()
    site_list = get_news_sites_for_US_en()

    for site in site_list:
        get_event_bus_stubber.add_response(
            "put_events",
            {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
            {
                "Entries": [
                    {
                        "EventBusName": os.environ["EVENT_BUS_NAME"],
                        "Source": os.environ["INGESTION_NAMESPACE"],
                        "Detail": create_event_data_for_ddb(site),
                        "DetailType": "config",
                    }
                ]
            },
        )
    get_event_bus_stubber.activate()

    from lambda_function import publish_config_handler

    assert None == publish_config_handler(lambda_event, None)


@mock_sts
@mock_dynamodb2
@mock.patch.dict(os.environ, {"CONFIG_PARAM": '{"country":"US", "language":"en"}'})
@mock.patch.dict(os.environ, {"SEARCH_QUERY": "fakequery"})
def test_invoke_lambda_for_json_str(get_event_bus_stubber):
    lambda_event = create_cw_schedule_event()
    site_list = get_news_sites_for_US_en()

    for site in site_list:
        get_event_bus_stubber.add_response(
            "put_events",
            {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
            {
                "Entries": [
                    {
                        "EventBusName": os.environ["EVENT_BUS_NAME"],
                        "Source": os.environ["INGESTION_NAMESPACE"],
                        "Detail": create_event_data_for_json_str(site),
                        "DetailType": "config",
                    }
                ]
            },
        )
    get_event_bus_stubber.activate()

    from lambda_function import publish_config_handler

    assert None == publish_config_handler(lambda_event, None)


@mock_sts
@mock_dynamodb2
def test_invoke_lambda_for_ddb_config_with_failed_count(get_event_bus_stubber):
    lambda_event = create_cw_schedule_event()
    create_ddb_table_for_US_en()
    site_list = get_news_sites_for_US_en()

    for site in site_list:
        get_event_bus_stubber.add_response(
            "put_events",
            {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 1},
            {
                "Entries": [
                    {
                        "EventBusName": os.environ["EVENT_BUS_NAME"],
                        "Source": os.environ["INGESTION_NAMESPACE"],
                        "Detail": create_event_data_for_ddb(site),
                        "DetailType": "config",
                    }
                ]
            },
        )
    get_event_bus_stubber.activate()

    from lambda_function import publish_config_handler

    assert None == publish_config_handler(lambda_event, None)


@mock_sts
@mock_dynamodb2
@mock_kinesis
def test_invoke_process_config_handler():
    lambda_event = create_event_bus_consumer_event()
    from lambda_function import process_config_handler

    create_kinesis_streams()
    created_ddb_for_tracker()
    assert None == process_config_handler(lambda_event, None)
