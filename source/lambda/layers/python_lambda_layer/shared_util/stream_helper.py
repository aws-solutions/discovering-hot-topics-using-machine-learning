#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os
import uuid

import boto3
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_client

logger = get_logger(__name__)


def buffer_data_into_stream(data, partition_key=None):
    """
    This method buffers data in to a Kinesis Data Stream. The lambda function calling it, should have an environment
    variable 'STREAM_NAME' whose value should be the name of the stream.
    """
    kds_client = get_service_client("kinesis")

    stream_name = os.environ["STREAM_NAME"]

    if not partition_key:
        partition_key = str(uuid.uuid4())

    response = kds_client.put_record(StreamName=stream_name, Data=json.dumps(data).encode('utf-8'), PartitionKey=partition_key)
    logger.debug(f"Response from buffering the stream is {response}")
    return response
