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

import csv
import json
import os
import pathlib
from collections import defaultdict
from datetime import datetime

import boto3
from shared_util import custom_boto_config, custom_logging

logger = custom_logging.get_logger(__name__)

s3 = boto3.client("s3", config=custom_boto_config.init())
sqs = boto3.resource("sqs", config=custom_boto_config.init())

event_bridge_client = boto3.client("events", config=custom_boto_config.init())

"""
Lambda functions provide a /tmp directory to store temporary files.
This is not the same /tmp as on a conventional unix OR linux
system. Hence suppressing the rule
"""
TMP_DIR = "/tmp/"  # NOSONAR (python:S5443)

"""
This method builds the mapping between the topics and the ids of the content and publishes it
to the eventbridge for storage and visualization
"""


class QueueNameNotProvidiedException(Exception):
    pass


def publish_topic_id_mapping(platform, job_id, timestamp, topic):
    topic_id_mapping = parse_csv_for_mapping(platform, job_id, timestamp, topic)
    try:
        for topic in topic_id_mapping:
            data = json.dumps(topic)
            logger.debug("Topic ID mapping to be published is " + data)
            event_bridge_client.put_events(
                Entries=[
                    {
                        "EventBusName": os.environ["EVENT_BUS_NAME"],
                        "Detail": data,
                        "Source": os.environ["TOPIC_MAPPINGS_EVENT_NAMESPACE"],
                        "DetailType": "mappings",
                    }
                ]
            )
    except Exception as e:
        logger.error(f"Exception occurred when processing topic mapping: {e}")
        raise e


def pubish_topics(source_prefix, job_id, timestamp, doc_topics_file_name):
    queue_name = os.environ.get("QUEUE_NAME")

    if queue_name:
        logger.debug(f"File name received is {doc_topics_file_name}")
        with open(doc_topics_file_name) as csvfile:
            csv_reader = csv.DictReader(csvfile, fieldnames=("docname", "topic", "proportion"))
            logger.debug("Accessing file to process topics")
            next(csv_reader)  # skip the header row

            queue = sqs.get_queue_by_name(QueueName=queue_name)

            for row in csv_reader:
                key = row["docname"].split(":")[0]
                queue.send_message(
                    MessageBody=json.dumps(
                        {
                            "Platform": source_prefix,
                            "JobId": job_id,
                            "SubmitTime": timestamp,
                            "Topic": {key: [row]},
                        }
                    )
                )
        logger.debug("Topic processing complete")
    else:
        logger.error("Could not find queue name set in environment variable")
        raise QueueNameNotProvidiedException("Could not find queue name set in environment variable")


def parse_csv_for_mapping(platform, job_id, timestamp, topic_content_dict):
    # initiatlize array to store topic number and id mapping
    topic_id_mapping = []

    # now query individual buckets and read specific lines to retrieve id
    for key_name in topic_content_dict:
        obj = s3.get_object(Bucket=os.environ["RAW_DATA_FEED"], Key=f"{platform}/{key_name}")
        # splitting byte code lines into an array. This saves decode call and is invoked later only if the line is read
        raw_feed_array = obj["Body"].read().split(b"\n")

        logger.debug(f"Processing key name: {key_name}")
        for record in topic_content_dict[key_name]:
            logger.debug(f"Processing record: {record}")
            line_number = int(record["docname"].split(":")[1])
            # calling decode here as we are now reading the line
            id_str = raw_feed_array[line_number - 1].decode("utf-8").split(",")[0]
            if len(id_str) > 0:
                mapping_record = {}
                mapping_record["platform"] = platform
                mapping_record["id_str"] = id_str
                mapping_record["job_id"] = job_id
                mapping_record["job_timestamp"] = timestamp
                mapping_record["topic"] = record["topic"]
                topic_id_mapping.append(mapping_record)

    if os.environ.get("LOG_LEVEL") == "DEBUG":
        for record in topic_id_mapping:
            logger.debug("Returning Topic ID mapping " + json.dumps(record))
    return topic_id_mapping


def publish_topics(job_id, timestamp, topic_terms_file_name=TMP_DIR + "output/topic-terms.csv"):
    """
    This method gets all the topics and publishes them to an eventbridge for storage and visualization
    """
    try:
        data = json.dumps(parse_csv_for_topics(job_id, timestamp, topic_terms_file_name))
        logger.debug("Topics to be published are " + data)
        event_bridge_client.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Detail": data,
                    "Source": os.environ["TOPICS_EVENT_NAMESPACE"],
                    "DetailType": "topics",
                }
            ]
        )
    except Exception as e:
        logger.error(f"Error ocurred when processing topics {e}")
        raise e


def parse_csv_for_topics(job_id, timestamp, topic_terms_file_name=TMP_DIR + "output/topic-terms.csv"):
    topic_word_dict = defaultdict(list)

    with open(topic_terms_file_name) as csvfile:
        csv_reader = csv.DictReader(csvfile, fieldnames=("topic", "term", "weight"))
        next(csv_reader)  # skip the header row
        for row in csv_reader:
            row["job_id"] = job_id
            row["job_timestamp"] = timestamp
            topic_word_dict[row["topic"]].append(row)
            logger.debug("Updated row value is " + json.dumps(row))
    return topic_word_dict
