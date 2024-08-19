#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os
import unittest
from unittest.mock import patch
from shared_util import custom_boto_config

import boto3
import pytest
from moto import mock_firehose, mock_s3

MOCK_BUCKET = "kinesis-test"


@mock_s3()
def s3_setup():
    conn = boto3.resource("s3", config=custom_boto_config.init())
    conn.create_bucket(Bucket=MOCK_BUCKET)


def create_s3_delivery_stream(client, stream_name):
    s3_setup()
    return client.create_delivery_stream(
        DeliveryStreamName=stream_name,
        DeliveryStreamType="DirectPut",
        ExtendedS3DestinationConfiguration={
            "RoleARN": "arn:aws:iam::{}:role/firehose_delivery_role".format(12345679012),
            "BucketARN": f"arn:aws:s3:::{MOCK_BUCKET}",
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


@mock_firehose
def test_topic_stream():
    firehose = boto3.client("firehose", region_name="us-east-1", config=custom_boto_config.init())
    create_s3_delivery_stream(firehose, "Topics")
    response = firehose.put_record(
        DeliveryStreamName="Topics",
        Record={
            "Data": json.dumps({"topic": "000", "term": "health", "weight": "0.09484477", "created_at": "2020-06-24"})
            + "\n"
        },
    )

    assert response["ResponseMetadata"]["HTTPStatusCode"] == 200


@mock_firehose
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
    assert response["ResponseMetadata"]["HTTPStatusCode"] == 200


@mock_firehose
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


@mock_firehose
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
            "platform": "twitter",
            "job_id": "1234567890123456789012345",
            "job_timestamp": "2020-06-26T19:05:16.785Z",
            "id_str": "1274349265528057858",
            "topic": "001",
        },
    }

    store_mappings(topicsEvent["detail"])
