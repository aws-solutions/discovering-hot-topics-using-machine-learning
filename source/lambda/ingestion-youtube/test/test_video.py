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
from datetime import datetime
from test.fixtures.event_bus_fixture import get_event_bus_stubber
from test.test_credential_helper import ssm_setup
from unittest.mock import patch

from moto import mock_ssm


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_search_video(mock_youtube_resource, get_event_bus_stubber):
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
    from util.video import search_videos

    search_videos(None)

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_search_video_with_10_or_more_iterations(mock_youtube_resource, get_event_bus_stubber):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    count = 15
    entries = []
    for loop in range(10):
        entries.append(
            {
                "EventBusName": os.environ["EVENT_BUS_NAME"],
                "Source": os.environ["VIDEO_NAMESPACE"],
                "Detail": json.dumps(
                    {
                        "VideoId": f"fakeId{loop}",
                        "SearchQuery": f'{os.environ["QUERY"]}#None',
                        "Title": "fakeTitle",
                    }
                ),
                "DetailType": "Video",
            }
        )

    get_event_bus_stubber.add_response(
        "put_events", {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0}, {"Entries": entries}
    )

    entries = []
    for loop in range(count - 10):
        entries.append(
            {
                "EventBusName": os.environ["EVENT_BUS_NAME"],
                "Source": os.environ["VIDEO_NAMESPACE"],
                "Detail": json.dumps(
                    {
                        "VideoId": f"fakeId{loop + 10}",
                        "SearchQuery": f'{os.environ["QUERY"]}#None',
                        "Title": "fakeTitle",
                    }
                ),
                "DetailType": "Video",
            }
        )

    get_event_bus_stubber.add_response(
        "put_events", {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0}, {"Entries": entries}
    )

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
                            "VideoId": f"fakeId{count}",
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

    items = []
    mock_responses = []

    for loop in range(count):
        items.append(
            {
                "kind": "youtube#searchResult",
                "id": {"kind": "youtube#video", "videoId": f"fakeId{loop}"},
                "snippet": {
                    "publishTime": publish_time,
                    "title": "fakeTitle",
                },
            }
        )

    mock_responses.append({"items": items, "nextPageToken": "fakePageToken"})
    mock_responses.append(
        {
            "items": [
                {
                    "kind": "youtube#searchResult",
                    "id": {"kind": "youtube#video", "videoId": f"fakeId{count}"},
                    "snippet": {
                        "publishTime": publish_time,
                        "title": "fakeTitle",
                    },
                }
            ],
            "nextPageToken": None,
        }
    )
    mock_youtube_resource.return_value.search.return_value.list.return_value.execute.side_effect = mock_responses

    get_event_bus_stubber.activate()
    from util.video import search_videos

    search_videos(None)

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_search_video_with_page_token(mock_youtube_resource, get_event_bus_stubber):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    count = 2
    entries = []
    for loop in range(count):
        entries.append(
            {
                "EventBusName": os.environ["EVENT_BUS_NAME"],
                "Source": os.environ["VIDEO_NAMESPACE"],
                "Detail": json.dumps(
                    {
                        "VideoId": f"fakeId{loop}",
                        "SearchQuery": f'{os.environ["QUERY"]}#None',
                        "Title": "fakeTitle",
                    }
                ),
                "DetailType": "Video",
            }
        )

    get_event_bus_stubber.add_response(
        "put_events", {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0}, {"Entries": entries}
    )

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
                            "VideoId": f"fakeId{count}",
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

    items = []
    mock_responses = []

    for loop in range(count):
        items.append(
            {
                "kind": "youtube#searchResult",
                "id": {"kind": "youtube#video", "videoId": f"fakeId{loop}"},
                "snippet": {
                    "publishTime": publish_time,
                    "title": "fakeTitle",
                },
            }
        )

    mock_responses.append({"items": items, "nextPageToken": "fakePageToken"})
    mock_responses.append(
        {
            "items": [
                {
                    "kind": "youtube#searchResult",
                    "id": {"kind": "youtube#video", "videoId": f"fakeId{count}"},
                    "snippet": {
                        "publishTime": publish_time,
                        "title": "fakeTitle",
                    },
                }
            ],
            "nextPageToken": None,
        }
    )
    mock_youtube_resource.return_value.search.return_value.list.return_value.execute.side_effect = mock_responses

    get_event_bus_stubber.activate()
    from util.video import search_videos

    search_videos(None)

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_search_video_with_event_bus_failures(mock_youtube_resource, get_event_bus_stubber):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 1},
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
    from util.video import search_videos

    search_videos(None)

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_ssm
@patch("util.video.get_youtube_service_resource")
def test_search_video_when_api_throws_error(mock_youtube_resource, get_event_bus_stubber):
    api_key = "fakeapikey"
    ssm_setup(api_key)

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

    import googleapiclient.errors
    import mock

    mock_youtube_resource.return_value.search.return_value.list.return_value.execute.side_effect = (
        googleapiclient.errors.HttpError(mock.Mock(status=403), "Error invoking API".encode("utf-8"))
    )
    get_event_bus_stubber.activate()

    from util.video import search_videos

    search_videos(None)

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


def test_youtube_search_request():
    with patch.dict("os.environ", {"QUERY": "fakevideosearchquery"}):
        from util.video import build_youtube_search_request

        query_response = build_youtube_search_request()
        assert "fakevideosearchquery" == query_response["q"]
        assert None == query_response.get("channelId", None)

    with patch.dict("os.environ", {"CHANNEL_ID": "fakechannelid"}):
        del os.environ["QUERY"]
        from util.video import build_youtube_search_request

        query_response = build_youtube_search_request()
        assert "fakechannelid" == query_response["channelId"]
        assert None == query_response.get("q", None)

    with patch.dict("os.environ", {"EVENT_TYPE": "fakeEventType"}):
        from util.video import build_youtube_search_request

        query_response = build_youtube_search_request()
        assert "fakeEventType" == query_response["eventType"]
        assert "fakeSearch" == query_response.get("q", None)

    with patch.dict("os.environ", {"LOCATION": "0,0", "LOCATION_RADIUS": "25mi"}):
        query_response = build_youtube_search_request()
        assert "0,0" == query_response["location"]
        assert "25mi" == query_response["locationRadius"]
        assert None == query_response.get("channelId", None)

    with patch.dict("os.environ", {"REGION_CODE": "fakeRegion"}):
        query_response = build_youtube_search_request()
        assert "fakeRegion" == query_response["regionCode"]
        assert None == query_response.get("channelId", None)

    with patch.dict("os.environ", {"RELEVANCE_LANGUAGE": "fakeLanguage"}):
        query_response = build_youtube_search_request()
        assert "fakeLanguage" == query_response["relevanceLanguage"]
        assert None == query_response.get("channelId", None)

    with patch.dict(
        "os.environ", {"RELEVANCE_LANGUAGE": "fakeLanguage", "REGION_CODE": "fakeRegion", "LOCATION": "0,0"}
    ):
        query_response = build_youtube_search_request()
        assert "fakeLanguage" == query_response["relevanceLanguage"]
        assert "fakeRegion" == query_response["regionCode"]
        assert "0,0" == query_response["location"]
        assert None == query_response.get("channelId", None)
        assert "fakeSearch" == query_response["q"]
