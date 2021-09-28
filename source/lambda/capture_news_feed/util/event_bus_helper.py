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

import boto3
from shared_util import custom_boto_config, custom_logging, service_helper

from util import config_helper, ddb_helper

logger = custom_logging.get_logger(__name__)


class ConfigEvent:
    """
    This class defines the structure of a config event
    """

    def __init__(self, platform, account, query, url_list: list, topic=None):
        self.platform = platform
        self.account = account
        self.query = query
        self.url_list = url_list
        self.topic = topic

    def __str__(self):
        return f"Query: {self.query} and URLs: {self.url_list}"


def publish_config(config_event: ConfigEvent, event_bus=None):
    if not event_bus:
        event_bus = service_helper.get_service_client("events")

    for url in config_event.url_list:
        event = {
            "platform": config_event.platform,
            "account": config_event.account,
            "query": config_event.query,
            "url": url,
        }

        if config_event.topic:
            event["topic"] = config_event.topic

        service_response = event_bus.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Source": os.environ["INGESTION_NAMESPACE"],
                    "Detail": json.dumps(event),
                    "DetailType": "config",
                }
            ]
        )

        if service_response["FailedEntryCount"]:
            logger.error(f"Failed to publish following event: {event}")

        logger.info(f"Published event {event} on event bus with response {service_response}")
