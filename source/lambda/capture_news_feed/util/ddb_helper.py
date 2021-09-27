#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
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

import os
from datetime import datetime, timedelta, timezone

import boto3
from boto3.dynamodb.conditions import Attr, Key
from shared_util import custom_boto_config, custom_logging, service_helper

logger = custom_logging.get_logger(__name__)


def get_config(dynamodb=None, **scan_kwargs):
    """ This method retrieves configuration list from DDB which are "enabled = True" """
    if not dynamodb:
        dynamodb = service_helper.get_service_resource("dynamodb")

    table = dynamodb.Table(os.environ["DDB_CONFIG_TABLE_NAME"])

    config_list = []
    start_key = None
    done = False

    while not done:
        scan_kwargs["FilterExpression"] = Attr("enabled").eq(True)
        if start_key:
            scan_kwargs["ExclusiveStartKey"] = start_key

        # scan all the config in the dynamodb table and filter records with enabled=false
        response = table.scan(**scan_kwargs)
        config_list.extend(response["Items"])

        # if "LastEvaluatedKey" is not part of the respose then do not pagingate. Hence exit the loop
        start_key = response.get("LastEvaluatedKey", None)
        done = start_key is None

    logger.debug(f"Dumping config_list: {config_list}")
    return config_list


def update_query(item, **put_item_kwargs):
    """
    This method updates the 'query' (data searched through APIs) details into DDB. THis information
    is used for tracking the last time a jop was run for an account
    """
    dynamodb = service_helper.get_service_resource("dynamodb")

    # hash key for the item should be account#url#topic#search_query and range key should be timestamp
    logger.info(f"Inserting item: {item}")
    table = dynamodb.Table(os.environ["TARGET_DDB_TABLE"])
    table.put_item(Item=item, **put_item_kwargs)


def update_query_tracker(account, url, search_query, topic=None):
    tracker_datetime = datetime.now(timezone.utc)
    query = "#".join([account, url])
    if topic:
        query = "#".join([query, topic])
    if search_query:
        query = "#".join([query, search_query])

    update_query(
        {
            "ID": query,
            "LAST_PUBLISHED_TIMESTAMP": tracker_datetime.isoformat(),
            "EXP_DATE": str(int((tracker_datetime + timedelta(days=7)).timestamp() * 1000)),
        }
    )


def get_query_tracker(account, url, search_query, topic=None, **item_kwargs):
    dynamodb = service_helper.get_service_resource("dynamodb")

    table = dynamodb.Table(os.environ["TARGET_DDB_TABLE"])
    query = "#".join([account, url])
    if topic:
        query = "#".join([query, topic])
    if search_query:
        query = "#".join([query, search_query])
    logger.info(f"Query to retrieve tracker is {query}")
    response = table.query(
        KeyConditionExpression=Key("ID").eq(query),
        Limit=1,
        ScanIndexForward=False,
    )
    if len(response["Items"]) == 0:
        logger.warn("Query tracker is empty")
        return {"LAST_PUBLISHED_TIMESTAMP": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}

    return response["Items"][0]  # since limit is 1, it will return only 1 record and hence taking the first index value
