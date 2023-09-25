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

import logging
import os
import re
import uuid
from copy import copy
from datetime import datetime

import requests
from crhelper import CfnResource

logger = logging.getLogger(__name__)
helper = CfnResource(json_logging=True, log_level="INFO")


@helper.create
@helper.update
@helper.delete
def custom_resource(event, _):
    request_type = event["RequestType"]
    resource_properties = event["ResourceProperties"]
    resource = resource_properties["Resource"]

    if resource == "UUID" and request_type == "Create":
        random_id = str(uuid.uuid4())
        helper.Data.update({"UUID": random_id})
    elif resource == "AnonymousMetric":
        try:
            metrics_data = {}
            metrics_data["Region"] = resource_properties["Region"]
            metrics_data["RequestType"] = request_type
            # determine query complexity, actual query not posted
            metrics_data["TopicJobFreq"] = resource_properties["TopicJobFreq"]
            # determine query complexity, actual query not posted
            metrics_data["NewsFeedsIngestionEnabled"] = resource_properties["NewsFeedsIngestionEnabled"]
            metrics_data["NewsFeedsSearchComplexity"] = len(resource_properties["NewsFeedsSearchQuery"].split(","))
            metrics_data["NewsFeedsSearchQueryLength"] = len(resource_properties["NewsFeedsSearchQuery"])
            metrics_data["NewsFeedsIngestionFreq"] = resource_properties["NewsFeedsIngestionFreq"]
            metrics_data["YoutubeIngestionEnabled"] = resource_properties["YoutubeIngestionEnabled"]
            metrics_data["YouTubeSearchQueryLength"] = len(resource_properties["YoutubeSearchQuery"])
            metrics_data["YouTubeIngestionFreq"] = resource_properties["YouTubeIngestionFreq"]
            metrics_data["YouTubeChannelIDSet"] = "True" if resource_properties["YoutubeChannelId"] else "False"
            metrics_data["RedditIngestionEnabled"] = resource_properties["RedditIngestionEnabled"]  
            metrics_data["RedditIngestionFreq"] = resource_properties["RedditIngestionFreq"]
            metrics_data["RedditIngestionSubredditCount"] = len(list(filter(None, resource_properties["SubredditsToFollow"].strip().split(","))))
            metrics_data["CustomIngestionEnabled"] = resource_properties["DeployCustomIngestion"]

            headers = {"Content-Type": "application/json"}
            payload = {
                "Solution": resource_properties["SolutionId"],
                "UUID": resource_properties["UUID"],
                "Version": resource_properties["Version"],
                "TimeStamp": datetime.utcnow().isoformat(),
                "Data": metrics_data,
            }

            logger.info(f"Sending payload: {payload}")
            response = requests.post("https://metrics.awssolutionsbuilder.com/generic", json=payload, headers=headers)
            logger.info(f"Response from metrics endpoint: {response.status_code} {response.reason}")
        except requests.exceptions.RequestException:
            logger.exception("Could not send usage data")
        except Exception:
            logger.exception("Unknown error when trying to send usage data")


def handler(event, context):
    helper(event, context)
