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


def _sanitize_data(resource_properties):
    # Remove ServiceToken (lambda arn) to avoid sending AccountId
    resource_properties.pop("ServiceToken", None)
    resource_properties.pop("Resource", None)

    # Solution ID and unique ID are sent separately
    resource_properties.pop("SolutionId", None)
    resource_properties.pop("UUID", None)
    resource_properties.pop("Version", None)

    return resource_properties


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
            metrics_data = _sanitize_data(copy(resource_properties))
            metrics_data["RequestType"] = request_type
            # determine query complexity, actual query not posted
            metrics_data["TwitterSearchQueryComplexity"] = len(
                re.split(" OR  | + ", os.environ.get("TWITTER_SEARCH_QUERY", ""))
            )
            metrics_data["TwitterSearchQueryLength"] = len(os.environ.get("TWITTER_SEARCH_QUERY", ""))
            metrics_data["TwitterLangFilter"] = os.environ.get("TWITTER_LANG_FILTER", "")
            metrics_data["TwitterIngestionFreq"] = os.environ.get("TWITTER_INGEST_FREQ", "")
            metrics_data["TopicJobFreq"] = os.environ["TOPIC_JOB_FREQ"]
            # determine query complexity, actual query not posted
            metrics_data["NewsFeedsSearchComplexity"] = len(os.environ.get("NEWSFEEDS_SEARCH_QUERY", "").split(","))
            metrics_data["NewsFeedsSearchQueryLength"] = len(os.environ.get("NEWSFEEDS_SEARCH_QUERY", ""))
            metrics_data["NewsFeedsIngestionFreq"] = os.environ.get("NEWSFEEDS_INGESTION_FREQ", "")
            metrics_data["YouTubeSearchQueryLength"] = len(os.environ.get("YOUTUBE_SEARCH_QUERY"))
            metrics_data["YouTubIngestionFreq"] = os.environ.get("YOUTUBE_INGESTION_FREQ", "")
            metrics_data["YouTubeChannelIDSet"] = "True" if os.environ.get("YOUTUBE_CHANNEL_ID", None) else "False"
            metrics_data["CustomIngestion"] = os.environ.get("DEPLOY_CUSTOM_INGESTION", "")

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
