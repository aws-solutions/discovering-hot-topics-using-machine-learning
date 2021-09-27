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
from datetime import datetime, timedelta
from test.fixtures.event_bus_fixture import get_event_bus_stubber
from test.test_credential_helper import ssm_setup
from test.test_ddb_helper import ddb_setup
from test.test_stream_helper import stream_setup
from unittest.mock import patch

from moto import mock_dynamodb2, mock_kinesis, mock_ssm
from util.comment import search_comments


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_lambda_search_videos(mock_youtube_resource, get_event_bus_stubber):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
        {
            "Entries": [
                {
                    "EventBusName": os.environ["EVENT_BUS_NAME"],
                    "Source": os.environ["VIDEO_NAMESPACE"],
                    "Detail": json.dumps(
                        {
                            "VideoId": "fakeId",
                            "SearchQuery": f'{os.environ["QUERY"]}#None',
                            "Title": "fakeTitle",
                        }
                    ),
                    "DetailType": "Video",
                }
            ]
        },
    )

    current_datetime = datetime.now()
    publish_time = current_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
    test_item = {
        "kind": "youtube#searchResult",
        "id": {"kind": "youtube#video", "videoId": "fakeId"},
        "snippet": {
            "publishTime": publish_time,
            "title": "fakeTitle",
        },
    }

    mock_youtube_resource.return_value.search.return_value.list.return_value.execute.return_value = {
        "items": [test_item],
        "nextPageToken": None,
    }

    get_event_bus_stubber.activate()
    from lambda_function import search_videos

    search_videos(None, None)
    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_lambda_search_comments(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    ddb_setup(os.environ["TARGET_DDB_TABLE"])
    kds_client = stream_setup(os.environ["STREAM_NAME"])

    video_id = "fakeVideoId"
    event = {
        "version": "0",
        "id": "fakeID",
        "detailtype": "Video",
        "source": "com.youtube.video",
        "account": "fakeaccount",
        "time": "2020-06-13T23:14:19Z",
        "region": "us-east-1",
        "resources": [],
        "detail": {"VideoId": video_id, "SearchQuery": "fakeQuery", "Title": "fakeTitle"},
    }

    mock_youtube_resource.return_value.commentThreads.return_value.list.return_value.execute.return_value = {
        "items": [
            {
                "id": "fakeId",
                "kind": "youtube#commentThread",
                "snippet": {
                    "topLevelComment": {
                        "id": "fakeCommentId",
                        "kind": "youtube#comment",
                        "snippet": {
                            "textDisplay": "Omg " "love " "it",
                            "textOriginal": "Omg " "love " "it",
                            "videoId": video_id,
                            "viewerRating": 2,
                            "likeCount": 0,
                            "publishedAt": datetime.now().isoformat(),
                            "updatedAt": datetime.now().isoformat(),
                        },
                    },
                    "videoId": video_id,
                },
            }
        ],
        "kind": "youtube#commentThreadListResponse",
        "pageInfo": {"resultsPerPage": 100, "totalResults": 1},
        "nextPageToken": None,
    }

    from lambda_function import search_comments

    search_comments(event, None)
