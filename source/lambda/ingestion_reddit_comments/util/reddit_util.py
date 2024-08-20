#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os
from shared_util import custom_logging, service_helper
from boto3.dynamodb.conditions import Key
from .reddit_exception import InvalidConfigurationError

logger = custom_logging.get_logger(__name__)


def get_tracker_state(sub_reddit_name):
    try:
        dynamodb = service_helper.get_service_resource("dynamodb")
        table = dynamodb.Table(os.environ["TARGET_DDB_TABLE"])
        db_response = table.query(
            KeyConditionExpression=Key("SUB_REDDIT").eq(sub_reddit_name),
            Limit=1
        )
        if len(db_response['Items']) > 0:
            before = db_response['Items'][0]['before']
            logger.debug(f"Before state for {sub_reddit_name} is {before}")
            return before
        else:
            logger.info(
                f"No state found for {sub_reddit_name}, hence returning None")
            return None
    except Exception as exception:
        logger.error(
            f"Error occured when trying to get subreddit tracker state from DynamoDB table, error is: {exception}")
        raise exception


def update_tracker_state(subreddit_name, before):
    try:
        dynamodb = service_helper.get_service_resource("dynamodb")
        table = dynamodb.Table(os.environ["TARGET_DDB_TABLE"])
        db_response = table.put_item(
            Item={
                'SUB_REDDIT': subreddit_name,
                'before': before
            }
        )
        logger.debug(
            f"Response from updating comments tracker for {subreddit_name}: {json.dumps(db_response)}")
    except Exception as exception:
        logger.error(
            f"Error occured updating comments tracker for subreddit {subreddit_name}. Error is {exception}")
        raise exception


def get_reddit_credentials():
    try:
        ssm_client = service_helper.get_service_client('ssm')
        response = ssm_client.get_parameter(
            Name=os.environ["REDDIT_API_KEY"],
            WithDecryption=True)
        reddit_creds = json.loads(response['Parameter']['Value'])
        if reddit_creds.get('clientId') is None or reddit_creds.get('clientSecret') is None or reddit_creds.get('refreshToken') is None:
            logger.error(
                "Either clientId or clientSecret or refreshToken is missing in the JSON string retrieved from Parameter Store")
            raise InvalidConfigurationError(
                "Either clientId or clientSecret or refreshToken is missing in the JSON string retrieved from Parameter Store")
        reddit_creds[
            'userAgent'] = f"{os.environ['STACK_NAME']}:{os.environ['SOLUTION_ID']}:{os.environ['SOLUTION_VERSION']} (by /u/user)"
        return reddit_creds
    except Exception as exception:
        logger.error(
            f"Error getting credentials for Reddit from SSM, error is: {exception}")
        raise exception
