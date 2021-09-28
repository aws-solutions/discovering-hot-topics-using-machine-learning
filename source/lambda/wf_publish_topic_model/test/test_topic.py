#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                     #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import json
import os
import tempfile
import unittest
from unittest.mock import patch

import boto3
import botocore.session
import mock
import pytest
from botocore.stub import Stubber
from moto import mock_s3


@mock_s3
def test_s3_mapping_bucket():
    with mock_s3():
        s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
        with open(
            os.path.join(
                os.path.dirname(__file__),
                "fixtures",
                "WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
            ),
            "r",
        ) as f:
            body = f.read()
        s3.create_bucket(Bucket="raw-feed")
        assert (
            s3.put_object(
                Bucket="raw-feed",
                Key="twitter/2020/06/25/19/WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
                Body=body,
            )["ResponseMetadata"]["HTTPStatusCode"]
            == 200
        )


@mock_s3
def test_parse_csv_mapping():
    from wf_publish_topic_model.util.topic import parse_csv_for_mapping, publish_topics

    with mock_s3():
        s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
        with open(
            os.path.join(
                os.path.dirname(__file__),
                "fixtures",
                "WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
            ),
            "r",
        ) as f:
            body = f.read()
        s3.create_bucket(Bucket="raw-feed")
        s3.put_object(
            Bucket="raw-feed",
            Key="twitter/2020/06/25/19/WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
            Body=body,
        )
    response = parse_csv_for_mapping(
        "twitter",
        "1234567890123456789012345",
        "2020-06-26T19:05:16.785Z",
        {
            "2020/06/25/19/WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd": [
                {
                    "docname": "twitter/2020/06/25/19/WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd:1",
                    "topic": "004",
                    "proportion": "fakenumber",
                }
            ]
        },
    )
    assert response[0]["job_id"] == "1234567890123456789012345"
    assert response[0]["job_timestamp"] == "2020-06-26T19:05:16.785Z"


@mock_s3
def test_publish_topic_id_mapping():
    with mock_s3():
        s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
        with open(
            os.path.join(
                os.path.dirname(__file__),
                "fixtures",
                "WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
            ),
            "r",
        ) as f:
            body = f.read()
        s3.create_bucket(Bucket="raw-feed")
        s3.put_object(
            Bucket="raw-feed",
            Key="twitter/2020/06/25/19/WfEngineRawForTAKinesisFire-rl7PaeLbt4Vx-1-2020-06-25-19-20-02-cd4559fa-5b3c-4b7e-8d8a-cfbbc48071dd",
            Body=body,
        )

    event_bridge_client = boto3.client("events", os.environ["AWS_REGION"])
    stubber = Stubber(event_bridge_client)
    stubber.add_response("put_events", {"FailedEntryCount": 0, "Entries": [{"EventId": "12456663423"}]})
    stubber.activate()
    with stubber:
        # from wf_publish_topic_model.util.topic import publish_topic_id_mapping
        # publish_topic_id_mapping('1234567890123456789012345', '2020-06-26T19:05:16.785Z')
        response = event_bridge_client.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Detail": json.dumps({"topic": "000", "id_str": "1276510199214485504"}),
                    "Source": os.environ["TOPIC_MAPPINGS_EVENT_NAMESPACE"],
                    "DetailType": "mappings",
                }
            ]
        )

        assert response["FailedEntryCount"] == 0
        assert response["Entries"][0]["EventId"] == "12456663423"


def test_parse_csv_for_topics():
    from collections import defaultdict

    from wf_publish_topic_model.util.topic import parse_csv_for_topics

    response = parse_csv_for_topics(
        "1234567890123456789012345",
        "2020-06-26T19:05:16.785Z",
        topic_terms_file_name=os.path.join(os.path.dirname(__file__), "fixtures/topic-terms.csv"),
    )
    assert type(response) is defaultdict
    assert type(response["000"]) is list
    assert len(response["000"]) == 7
    assert response["000"][0]["job_id"] == "1234567890123456789012345"
    assert response["000"][0]["job_timestamp"] == "2020-06-26T19:05:16.785Z"


def test_publish_on_event_bridge():
    event_bridge_client = boto3.client("events", os.environ["AWS_REGION"])
    stubber = Stubber(event_bridge_client)
    stubber.add_response("put_events", {"FailedEntryCount": 0, "Entries": [{"EventId": "12456663423"}]})
    stubber.activate()
    with stubber:
        response = event_bridge_client.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Detail": json.dumps(
                        {
                            "000": [
                                {"topic": "000", "term": "hill", "weight": "0.17230435"},
                                {"topic": "000", "term": "make", "weight": "0.005689891"},
                                {"topic": "000", "term": "favorite", "weight": "0.0046757753"},
                            ]
                        }
                    ),
                    "Source": os.environ["TOPICS_EVENT_NAMESPACE"],
                    "DetailType": "topics",
                }
            ]
        )

        assert response["FailedEntryCount"] == 0
        assert response["Entries"][0]["EventId"] == "12456663423"


def test_publish_on_event_bridge_with_parse_file():
    event_bridge_client = boto3.client("events", os.environ["AWS_REGION"])
    stubber = Stubber(event_bridge_client)
    stubber.add_response("put_events", {"FailedEntryCount": 0, "Entries": [{"EventId": "12456663423"}]})
    stubber.activate()
    with stubber:
        from wf_publish_topic_model.util.topic import parse_csv_for_topics

        response = event_bridge_client.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Detail": json.dumps(
                        parse_csv_for_topics(
                            "1234567890123456789012345",
                            "2020-06-26T19:05:16.785Z",
                            topic_terms_file_name=os.path.join(os.path.dirname(__file__), "fixtures/topic-terms.csv"),
                        )
                    ),
                    "Source": os.environ["TOPICS_EVENT_NAMESPACE"],
                    "DetailType": "topics",
                }
            ]
        )

        assert response["FailedEntryCount"] == 0
        assert response["Entries"][0]["EventId"] == "12456663423"


# Sample event for testing
"""
    {
    "TopicsDetectionJobProperties": {
        "JobId": "1234567890123456789012345",
        "JobName": "topic_modeling_job",
        "JobStatus": "COMPLETED",
        "SubmitTime": "2020-06-26T19:05:16.785Z",
        "EndTime": "2020-06-26T19:31:13.798Z",
        "InputDataConfig": {
            "S3Uri": "s3://testbucket,
            "InputFormat": "ONE_DOC_PER_LINE"
        },
        "OutputDataConfig": {
            "S3Uri": "s3://inferencebucket/testaccount-TOPICS-some1233556sagsdfa/output/output.tar.gz"
        },
        "NumberOfTopics": 25,
        "DataAccessRoleArn": "arn:aws:iam::testaccount:role/service-role/AmazonComprehendServiceRole"
    }
}
"""
