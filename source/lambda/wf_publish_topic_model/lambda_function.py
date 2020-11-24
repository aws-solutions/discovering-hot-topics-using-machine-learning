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

import os
import tarfile
from collections import defaultdict
from urllib.parse import urlparse

import boto3

from util.logging import get_logger
from util.topic import publish_topic_id_mapping, publish_topics

logger = get_logger(__name__)

s3 = boto3.client("s3", os.environ["AWS_REGION"])


def handler(event, context):
    s3_uri_parse = urlparse(event["OutputDataConfig"]["S3Uri"])
    bucket = s3_uri_parse.netloc
    key = s3_uri_parse.path.lstrip("/")
    logger.debug("Bucket is " + bucket + " and key is " + key)
    file_name = os.path.basename(key)
    logger.debug("File name is " + file_name)
    try:
        s3.download_file(bucket, key, "/tmp/" + file_name)
        # TODO - how to handle larger files
        logger.debug(file_name + " downloaded from S3 bucket")
        if tarfile.is_tarfile("/tmp/" + file_name):
            archive_file = tarfile.open("/tmp/" + file_name)
            archive_file.extractall("/tmp/")
        archive_file.close()
        # logger.debug('Extraction complete. Files in the directory are '+os.path.listdir('/tmp'))

        # get job ID and timestamp details
        jobID = event["JobId"]
        timestamp = event["SubmitTime"]

        publish_topics(jobID, timestamp, topic_terms_file_name="/tmp/topic-terms.csv")
        publish_topic_id_mapping(jobID, timestamp, doc_topics_file_name="/tmp/doc-topics.csv")
        logger.debug("Publishing topics and mappings complete")
    except Exception as e:
        raise e
    return
