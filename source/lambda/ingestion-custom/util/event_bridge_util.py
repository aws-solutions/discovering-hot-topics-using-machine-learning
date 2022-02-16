#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed underthe Apache License, Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import os
import boto3
import botocore
import json
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_client
from file_processor.file_processor import IncorrectEnvSetup

logger = get_logger(__name__)


class EventPublishException(Exception):
    pass


def send_event(payload, detail_type, source):
    """
    Method to publish json data as events to custom bus. The method expects the event bus
    name to be set as a lambda environment variable
    """
    if os.environ.get("INTEGRATION_BUS_NAME", None):
        events = get_service_client("events")
        response = events.put_events(
            Entries=[
                {
                    "EventBusName": os.environ["INTEGRATION_BUS_NAME"],
                    "Detail": payload,
                    "DetailType": detail_type,
                    "Source": source,
                }
            ]
        )

        if response["FailedEntryCount"] and response["FailedEntryCount"] > 0:
            err_msg = f"Following record failed publishing {payload}"
            logger.error(err_msg)
            raise EventPublishException(err_msg)
        return response
    else:
        err_msg = "Event bus name not set in environment variable configuration for this lambda function"
        logger.error(err_msg)
        raise IncorrectEnvSetup(err_msg)
