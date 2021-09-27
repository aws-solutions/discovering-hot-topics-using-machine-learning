#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      #
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
            response = firehose.put_record(
                DeliveryStreamName=os.environ["TOPICS_FIREHOSE"],
                Record={
                    "Data": json.dumps(
                        {
                            "job_id": record["job_id"],
                            "job_timestamp": datetime.strftime(
                                datetime.strptime(record["job_timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ"),
                                "%Y-%m-%d %H:%M:%S.%f",
                            ),
                            "topic": record["topic"],
                            "term": record["term"],
                            "weight": record["weight"],
                        }
                    )
                    + "\n"
                },
            )
            logger.debug("Response for record " + record["job_id"] + "is " + json.dumps(response))


def store_mappings(data):
    logger.debug("Data received is " + json.dumps(data))
    response = firehose.put_record(
        DeliveryStreamName=os.environ["TOPIC_MAPPINGS_FIREHOSE"],
        Record={
            "Data": json.dumps(
                {
                    "platform": data["platform"],
                    "job_id": data["job_id"],
                    "job_timestamp": datetime.strftime(
                        datetime.strptime(data["job_timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ"), "%Y-%m-%d %H:%M:%S.%f"
                    ),
                    "topic": data["topic"],
                    "id_str": data["id_str"],
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
