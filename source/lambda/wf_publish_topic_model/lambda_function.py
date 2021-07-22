#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
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
import tarfile
from collections import defaultdict
from urllib.parse import urlparse

import boto3
from dht_config import custom_boto_config, custom_logging

from util.topic import get_topic_dict, publish_topic_id_mapping, publish_topics

logger = custom_logging.get_logger(__name__)

s3 = boto3.client("s3", config=custom_boto_config.init())
sqs = boto3.resource("sqs", config=custom_boto_config.init())

TMP_DIR = "/tmp/"  # NOSONAR (python:S5443)


class IngestionSourcePrefixMissingError(Exception):
    pass


def handler(event, context):
    topic_handler(event, context)
    topic_terms_handler(event, context)


def topic_handler(event, context):
    source_prefix_list = os.environ["SOURCE_PREFIX"].lower().split(",")
    file_name = "doc-topics.csv"

    queue = sqs.get_queue_by_name(QueueName=os.environ["QUEUE_NAME"])

    for source_prefix in source_prefix_list:
        if is_file_available(event, source_prefix, file_name):
            try:
                # get job ID and timestamp details
                job_id = event[source_prefix]["JobId"]
                timestamp = event[source_prefix]["SubmitTime"]
                topic_content_dict = get_topic_dict(doc_topics_file_name=TMP_DIR + file_name)

                for key, value in topic_content_dict.items():
                    response = queue.send_message(
                        MessageBody=json.dumps(
                            {"Platform": source_prefix, "JobId": job_id, "SubmitTime": timestamp, "Topic": {key: value}}
                        )
                    )
                    logger.debug(f"Published message with response: {response}")
            except Exception as e:
                logger.error(f"Error occured when processing topics: e")
                raise e


def topic_mapping_handler(event, context):
    records = event["Records"]
    logger.debug("Staring to process the records")
    try:
        for record in records:
            logger.debug(f"Records is {record}")
            message = json.loads(record["body"])
            publish_topic_id_mapping(message["Platform"], message["JobId"], message["SubmitTime"], message["Topic"])

    except Exception as e:
        logger.error(f"Error occured when processing topics: {e}")
        raise e
    logger.debug("Publishing topics mappings complete")


def topic_terms_handler(event, context):
    source_prefix_list = os.environ["SOURCE_PREFIX"].lower().split(",")
    file_name = "topic-terms.csv"

    for source_prefix in source_prefix_list:
        if is_file_available(event, source_prefix, file_name):
            try:
                # get job ID and timestamp details
                job_id = event[source_prefix]["JobId"]
                timestamp = event[source_prefix]["SubmitTime"]
                publish_topics(job_id, timestamp, topic_terms_file_name=TMP_DIR + file_name)
                logger.debug("Publishing topics terms complete")
            except Exception as e:
                logger.error(f"Error occured when processing topics: {e}")
                raise e


def is_file_available(event, source_prefix, file_to_extract):
    if event.get(source_prefix, None):
        s3_uri_parse = urlparse(event[source_prefix]["OutputDataConfig"]["S3Uri"])
        bucket = s3_uri_parse.netloc
        key = s3_uri_parse.path.lstrip("/")
        logger.debug("Bucket is " + bucket + " and key is " + key)
        file_name = os.path.basename(key)
        logger.debug("File name is " + file_name)
        try:
            """
            Lambda functions provide a /tmp directory to store temporary files.
            This is not the same /tmp as on a conventional unix OR linux
            system. Hence suppressing the rule
            """
            s3.download_file(bucket, key, TMP_DIR + file_name)
            logger.debug(file_name + " downloaded from S3 bucket")
            if tarfile.is_tarfile(TMP_DIR + file_name):
                archive_file = tarfile.open(TMP_DIR + file_name)
                archive_file.extractall(TMP_DIR, member_file_to_extract(archive_file, file_to_extract))
            archive_file.close()
            logger.debug(f"Extraction complete. Files in the directory are {os.listdir(TMP_DIR)}")
            return True
        except Exception as e:
            logger.error("Error occured when processing topics")
            raise e
    else:
        logger.error(f"Ingestion source prefix information not available in event to process data")
        raise IngestionSourcePrefixMissingError(
            "Ingestion source prefix information not available in event to process data"
        )


def member_file_to_extract(archive_file, file_to_extract):
    for tarinfo in archive_file:
        logger.debug(f"File name in archive: {tarinfo.name} and ")
        if os.path.basename(tarinfo.name) == file_to_extract:
            logger.debug(f"inside if loop {tarinfo}")
            yield tarinfo
