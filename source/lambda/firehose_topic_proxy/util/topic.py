#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import datetime
import json
import os
from datetime import datetime

import boto3
from botocore import config
from shared_util import custom_boto_config, custom_logging

logger = custom_logging.get_logger(__name__)

firehose = boto3.client("firehose", config=custom_boto_config.init())


def store_topics(data):
    for key in data:
        for record in data[key]:
            logger.debug("Record information for writing to Firehose is " + json.dumps(record))
            record_timestamp = datetime.strftime(
                datetime.strptime(record["job_timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ"),
                "%Y-%m-%d %H:%M:%S",
            )
            response = firehose.put_record(
                DeliveryStreamName=os.environ["TOPICS_FIREHOSE"],
                Record={
                    "Data": json.dumps(
                        {
                            "job_id": record["job_id"],
                            "job_timestamp": record_timestamp,
                            "topic": record["topic"],
                            "term": record["term"],
                            "weight": record["weight"],
                            # duplicating the value, since this column is used for partitioning and
                            # partitioning loses time precision (has only date)
                            "created_at": record_timestamp,
                        }
                    )
                    + "\n"
                },
            )
            logger.debug("Response for record " + record["job_id"] + "is " + json.dumps(response))


def store_mappings(data):
    logger.debug("Data received is " + json.dumps(data))
    record_timestamp = datetime.strftime(
        datetime.strptime(data["job_timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ"), "%Y-%m-%d %H:%M:%S"
    )
    response = firehose.put_record(
        DeliveryStreamName=os.environ["TOPIC_MAPPINGS_FIREHOSE"],
        Record={
            "Data": json.dumps(
                {
                    "platform": data["platform"],
                    "job_id": data["job_id"],
                    "job_timestamp": record_timestamp,
                    "topic": data["topic"],
                    "id_str": data["id_str"],
                    # duplicating the value, since this column is used for partitioning and
                    # partitioning loses time precision (has only date)
                    "created_at": record_timestamp,
                }
            )
            + "\n"
        },
    )
    logger.debug(
        "Response for record "
        + json.dumps({"platform": data["platform"], "topic": data["topic"], "id_str": data["id_str"]})
        + "is "
        + json.dumps(response)
    )
