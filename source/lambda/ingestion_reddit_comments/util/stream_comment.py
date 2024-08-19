#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os
import json
import re
from datetime import datetime
from shared_util import custom_logging, service_helper


logger = custom_logging.get_logger(__name__)
kinesis_client = None
records = []


def publish_comment(comment, flush=False):
    global records
    del comment['_reddit']
    del comment['_replies']
    comment['subreddit'] = comment['subreddit'].display_name
    comment['author'] = comment['author'].name
    comment['text'] = re.sub(r'[\n\r]+', ' ', comment['body'])[:5000].strip()
    comment['created_at'] = datetime.fromtimestamp(
        comment['created_utc']).strftime("%Y-%m-%d %H:%M:%S")
    comment['id_str'] = comment['name']
    records.append({
        'Data': json.dumps({
            'account_name': 'subreddit',
            'platform': 'reddit',
            'search_query': comment['subreddit_name_prefixed'],
            'feed': comment
        }),
        'PartitionKey': comment['name']
    })
    if flush or len(records) >= 10:
        publish_records_to_kinesis()


def publish_records_to_kinesis():
    global records, kinesis_client
    if len(records) == 0:
        return
    if not kinesis_client:
        kinesis_client = service_helper.get_service_client("kinesis")
    try:
        response = kinesis_client.put_records(
            Records=records,
            StreamName=os.environ['STREAM_NAME']
        )
        logger.debug(f"Response from data stream is: {json.dumps(response)}")
    except Exception as exception:
        logger.error(
            f"Error publishing records to Kinesis Data Streams, error is: {exception}")
        raise exception
    finally:
        # even if records fail, flush the array so that it does not grow to cause resource constraints
        records = []
