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
import logging
import os
from datetime import datetime, timedelta

import googleapiclient.errors
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_client, get_service_resource

from util import credential_helper
from util.youtube_service_helper import get_youtube_service_resource

logger = get_logger(__name__)


def search_videos(event):
    youtube = get_youtube_service_resource()

    video_search_params = build_youtube_search_request()

    while True:
        logger.debug(f"video search parameters: {json.dumps(video_search_params)}")

        request = youtube.search().list(**video_search_params)
        try:
            youtube_response = request.execute()
            if youtube_response.get("items", None) and len(youtube_response["items"]) == 0:
                logger.warn(f"Found no videos for {json.dumps(video_search_params)}")
            process_response(youtube_response, video_search_params)

            next_page_token = youtube_response.get("nextPageToken", None)
            if next_page_token:
                logger.debug(f"Next page token is {next_page_token}")
                video_search_params["pageToken"] = next_page_token
            else:
                break
        except googleapiclient.errors.HttpError as error:
            logger.error(f"Error executing video search, breaking the loop: {error}")
            break


def build_youtube_search_request():
    """
    Building a query based on the following API - https://developers.google.com/youtube/v3/docs/search/list
    """
    video_search_params = {
        "part": "id,snippet",
        "type": "video",
        "maxResults": 50,
        "publishedAfter": (datetime.now() - timedelta(days=int(os.environ["VIDEO_SEARCH_INGESTION_WINDOW"]))).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),  # format required 1970-01-01T00:00:00Z
    }

    if os.environ.get("QUERY", None):
        q = os.environ["QUERY"].replace("|", "%7C")  # any use of | has to be url encoded
        video_search_params["q"] = q

    if os.environ.get("CHANNEL_ID", None):
        video_search_params["channelId"] = os.environ["CHANNEL_ID"]

    video_search_params["channelType"] = os.environ.get("CHANNEL_TYPE", "any")

    if os.environ.get("EVENT_TYPE", None):
        video_search_params["eventType"] = os.environ["EVENT_TYPE"]

    if os.environ.get("LOCATION", None):
        video_search_params["location"] = os.environ["LOCATION"]
        if os.environ.get("LOCATION_RADIUS", None):
            video_search_params["locationRadius"] = os.environ["LOCATION_RADIUS"]

    if os.environ.get("REGION_CODE", None):
        video_search_params["regionCode"] = os.environ["REGION_CODE"]

    if os.environ.get("RELEVANCE_LANGUAGE", None):
        video_search_params["relevanceLanguage"] = os.environ["RELEVANCE_LANGUAGE"]

    return video_search_params


def process_response(youtube_response, video_search_params):
    event_bus = get_service_client("events")
    count = 1
    comments = []

    logger.debug(f"video search parameters {json.dumps(video_search_params)}")
    search_query = f'{video_search_params.get("q", None)}#{video_search_params.get("channelId", None)}'

    for index, item in enumerate(youtube_response["items"]):
        logger.debug(f"Item is {item}")
        comments.append(
            {
                "EventBusName": os.environ["EVENT_BUS_NAME"],
                "Source": os.environ["VIDEO_NAMESPACE"],
                "Detail": json.dumps(
                    {"VideoId": item["id"]["videoId"], "SearchQuery": search_query, "Title": item["snippet"]["title"]}
                ),
                "DetailType": "Video",
            }
        )
        logger.debug(f"Count is {count}")
        # optimize the loop to perform put_events with every 10 items
        if count == 10 or len(youtube_response["items"]) - index == 1:
            service_response = event_bus.put_events(Entries=comments)

            logger.debug(f"Put events response is {json.dumps(service_response)}")
            failed_entry_count = service_response.get("FailedEntryCount", None)
            if failed_entry_count > 0:
                logger.error(f"Error in put events {json.dumps(service_response['Entries'])}")

            count = 1
            comments = []
        else:
            count = count + 1  # optimize the loop to perform put_events with every 10 items
