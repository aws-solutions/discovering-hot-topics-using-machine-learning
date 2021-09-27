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

import json
import os

from shared_util import custom_boto_config, custom_logging

from util import config_helper, ddb_helper, event_bus_helper
from util.ddb_helper import get_query_tracker
from util.event_bus_helper import ConfigEvent
from util.newscatcher_helper import create_and_publish_record, retrieve_feed, retrieve_feed_from_all_topics

logger = custom_logging.get_logger(__name__)


class IncorrectEventNameSpaceError(Exception):
    pass


def publish_config_handler(event, context):
    """ If lambda environment variable is set to read from os.environ, if not read from DDB """
    if os.environ.get("CONFIG_PARAM", None):
        """
        This condition is executed if the config is setup through lambda environment variable. This allows for
        only 1 configuration item to be created with a query parameter
        """
        url_list = config_helper.retrieve_urls_using_json(os.environ["CONFIG_PARAM"])
        logger.debug(f"Print url list: {url_list}")
        config_event = ConfigEvent(
            platform="newsfeeds", account="url_params", query=os.environ["SEARCH_QUERY"], url_list=url_list
        )
        event_bus_helper.publish_config(config_event)

        logger.debug(f"Event published is: {config_event}")
    else:
        """
        If the lambda environment variable is not set, it will look for configuration in the dynamodb table
        """
        config_list = ddb_helper.get_config()
        for item in config_list:

            url_list = config_helper.retrieve_urls(
                country=item.get("country", None), language=item.get("language", None), topic=item.get("topic", None)
            )

            config_event = ConfigEvent(
                platform=item["platform"], account=item["account"], query=item["query"], url_list=url_list
            )
            event_bus_helper.publish_config(config_event)

            logger.debug(f"Event published is: {config_event}")


def process_config_handler(event, context):
    if event["source"] == os.environ["INGESTION_NAMESPACE"]:
        data = event["detail"]

        aggregated_feed = None
        if data.get("topic", None) is None:
            logger.debug("Since topic is none, gettting news feed for all available topics")
            aggregated_feed = retrieve_feed_from_all_topics(data["url"])
        else:
            logger.debug(f"Retrieving news feed for topic: {data['topic']}")
            aggregated_feed = retrieve_feed(data.url, topic=data["topic"])

        for feed in aggregated_feed:
            account = data["account"]
            url = data["url"]
            search_query = data.get("query", None)

            # if search_query is set empty or as ALL or as '*', it not filter any records, hence setting  it as None
            if search_query == "" or search_query == "ALL" or search_query == "*":
                search_query = None

            tracker = get_query_tracker(account, url, search_query, feed["topic"])
            create_and_publish_record(
                feed, account, data["platform"], tracker["LAST_PUBLISHED_TIMESTAMP"], search_query
            )

            ddb_helper.update_query_tracker(account, feed["url"], search_query, feed["topic"])

    else:
        logger.error("Target resource not configured for received namespace")
        raise IncorrectEventNameSpaceError("Target resource not configured for received namespace")
