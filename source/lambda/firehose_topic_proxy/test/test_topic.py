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
import unittest
from unittest.mock import patch

import boto3
import pytest
from moto import mock_kinesis


def create_s3_delivery_stream(client, stream_name):
    return client.create_delivery_stream(
        DeliveryStreamName=stream_name,
        DeliveryStreamType="DirectPut",
        ExtendedS3DestinationConfiguration={
            "RoleARN": "arn:aws:iam::{}:role/firehose_delivery_role".format(12345679012),
            "BucketARN": "arn:aws:s3:::kinesis-test",
            "Prefix": "myFolder/",
            "CompressionFormat": "UNCOMPRESSED",
            "DataFormatConversionConfiguration": {
                "Enabled": True,
                "InputFormatConfiguration": {"Deserializer": {"HiveJsonSerDe": {}}},
                "OutputFormatConfiguration": {"Serializer": {"ParquetSerDe": {"Compression": "UNCOMPRESSED"}}},
                "SchemaConfiguration": {
                    "DatabaseName": "socialmediadb",
                    "RoleARN": "arn:aws:iam::{}:role/firehose_delivery_role".format(12345679012),
                    "TableName": "topics",
                },
            },
        },
    )


@mock_kinesis
def test_topic_stream():
    firehose = boto3.client("firehose", region_name="us-east-1")
    create_s3_delivery_stream(firehose, "Topics")
    response = firehose.put_record(
        DeliveryStreamName="Topics",
        Record={
            "Data": json.dumps({"topic": "000", "term": "health", "weight": "0.09484477", "created_at": "2020-06-24"})
            + "\n"
        },
    )

    assert response["RecordId"] == 12345678


@mock_kinesis
def test_mappings_stream():
    firehose = boto3.client("firehose", region_name="us-east-1")
    create_s3_delivery_stream(firehose, "TopicMappings")
    response = firehose.put_record(
        DeliveryStreamName="TopicMappings",
        Record={
            "Data": json.dumps(
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "id_str": "1274349265528057858",
                    "topic": "005",
                }
            )
            + "\n"
        },
    )

    assert response["RecordId"] == 12345678


@mock_kinesis
def test_store_topics():
    from util.topic import store_topics

    firehose = boto3.client("firehose", region_name="us-east-1")
    create_s3_delivery_stream(firehose, "Topics")

    topicsEvent = {
        "version": "0",
        "id": "de55e880-0f1d-4b1d-982e-23ed13e45aaa",
        "detail-type": "topics",
        "source": "com.analyze.topic.inference.topics",
        "account": "FAKEACCOUNT",
        "time": "2020-06-24T17:16:02Z",
        "region": "us-west-2",
        "resources": [],
        "detail": {
            "000": [
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "000",
                    "term": "health",
                    "weight": "0.09484477",
                },
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "000",
                    "term": "walk",
                    "weight": "0.020982718",
                },
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "000",
                    "term": "like",
                    "weight": "0.004689377",
                },
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "000",
                    "term": "place",
                    "weight": "0.0056834435",
                },
            ],
            "001": [
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "001",
                    "term": "actor",
                    "weight": "0.13023746",
                },
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "001",
                    "term": "movie",
                    "weight": "0.002189455",
                },
                {
                    "job_id": "1234567890123456789012345",
                    "job_timestamp": "2020-06-26T19:05:16.785Z",
                    "topic": "001",
                    "term": "song",
                    "weight": "0.002034978",
                },
            ],
        },
    }

    store_topics(topicsEvent["detail"])


@mock_kinesis
def test_mappings_topics():
    from util.topic import store_mappings

    firehose = boto3.client("firehose", region_name="us-east-1")
    create_s3_delivery_stream(firehose, "TopicMappings")

    topicsEvent = {
        "version": "0",
        "id": "b2123492-5ecc-1a7a-33b6-58e9798e9a27",
        "detail-type": "mappings",
        "source": "com.analyze.topic.inference.mappings",
        "account": "FAKEACCOUNT",
        "time": "2020-06-24T17:16:05Z",
        "region": "us-west-2",
        "resources": [],
        "detail": {
            "job_id": "1234567890123456789012345",
            "job_timestamp": "2020-06-26T19:05:16.785Z",
            "id_str": "1274349265528057858",
            "topic": "001",
        },
    }

    store_mappings(topicsEvent["detail"])
