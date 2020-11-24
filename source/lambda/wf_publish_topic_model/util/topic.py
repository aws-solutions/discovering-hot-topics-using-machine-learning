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

import csv
import json
import os
import pathlib
from collections import defaultdict
from datetime import datetime

import boto3

from util.logging import get_logger

logger = get_logger(__name__)

s3 = boto3.client("s3")
event_bridge_client = boto3.client("events", os.environ["AWS_REGION"])

"""
This method builds the mapping between the topics and the ids of the content and publishes it
to the eventbridge for storage and visualization
"""


def publish_topic_id_mapping(jobID, timestamp, doc_topics_file_name="/tmp/output/doc-topics.csv"):
    topic_id_mapping = parse_csv_for_mapping(jobID, timestamp, doc_topics_file_name)
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
        print(e)
        raise e


def parse_csv_for_mapping(jobID, timestamp, doc_topics_file_name="/tmp/output/doc-topics.csv"):
    topic_content_dict = defaultdict(list)

    with open(doc_topics_file_name) as csvfile:
        csv_reader = csv.DictReader(csvfile, fieldnames=("docname", "topic", "proportion"))
        next(csv_reader)  # skip the header row
        for row in csv_reader:
            key = row["docname"].split(":")[0]
            p = pathlib.Path(key)
            # storing with bucket name as key to optimize S3.get calls
            topic_content_dict[str(pathlib.Path(*p.parts[1:]))].append(row)

    # initiatlize array to store topic number and id mapping
    topic_id_mapping = []

    # now query individual buckets and read specific lines to retrieve id
    for key_name in topic_content_dict:

        obj = s3.get_object(Bucket=os.environ["RAW_DATA_FEED"], Key=key_name)
        # splitting byte code lines into an array. This saves decode call and is invoked later only if the line is read
        raw_feed_array = obj["Body"].read().split(b"\n")

        for record in topic_content_dict[key_name]:
            line_number = int(record["docname"].split(":")[1])
            # calling decode here as we are now reading the line
            id = raw_feed_array[line_number - 1].decode("utf-8").split(",")[0]
            if len(id) > 0:
                mapping_record = {}
                mapping_record["id_str"] = id
                mapping_record["job_id"] = jobID
                mapping_record["job_timestamp"] = timestamp
                mapping_record["topic"] = record["topic"]
                topic_id_mapping.append(mapping_record)

    logger.debug("Returning Topic ID mapping " + json.dumps(topic_id_mapping))
    return topic_id_mapping


"""
This method gets all the topics and publishes them to an eventbridge for storage and visualization
"""


def publish_topics(jobID, timestamp, topic_terms_file_name="/tmp/output/topic-terms.csv"):
    try:
        data = json.dumps(parse_csv_for_topics(jobID, timestamp, topic_terms_file_name))
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
        print(e)
        raise e


def parse_csv_for_topics(jobID, timestamp, topic_terms_file_name="/tmp//output/topic-terms.csv"):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    topic_word_dict = defaultdict(list)

    with open(topic_terms_file_name) as csvfile:
        csv_reader = csv.DictReader(csvfile, fieldnames=("topic", "term", "weight"))
        next(csv_reader)  # skip the header row
        for row in csv_reader:
            row["job_id"] = jobID
            row["job_timestamp"] = timestamp
            topic_word_dict[row["topic"]].append(row)
            logger.debug("Updated row value is " + json.dumps(row))
    return topic_word_dict
