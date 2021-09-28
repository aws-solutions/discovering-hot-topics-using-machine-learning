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
from test.test_credential_helper import ssm_setup
from test.test_ddb_helper import ddb_setup
from test.test_stream_helper import stream_setup
from unittest.mock import patch

from moto import mock_dynamodb2, mock_kinesis, mock_ssm
from util.comment import Comment, search_comments, slice_text_into_arrays

api_response_time_format = "%Y-%m-%dT%H:%M:%SZ"


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments(mock_youtube_resource):
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
                            "publishedAt": "2021-08-12T22:34:33Z",
                            "textDisplay": "Omg " "love " "it",
                            "textOriginal": "Omg " "love " "it",
                            "updatedAt": "2021-08-12T22:34:33Z",
                            "videoId": video_id,
                            "viewerRating": 2,
                            "likeCount": 0,
                            "updatedAt": datetime.now().strftime(api_response_time_format),
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

    assert None == search_comments(event)


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments_with_tracker_date(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    table_name = os.environ["TARGET_DDB_TABLE"]
    ddb = ddb_setup(table_name)
    video_id = "fakeVideoId"

    current_time = datetime.now()
    expiry_window = str(
        int((current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp() * 1000)
    )
    ddb_item = {
        "VIDEO_ID": video_id,
        "LAST_QUERIED_TIMESTAMP": (current_time - timedelta(days=2)).isoformat(),
        "EXP_DATE": {"N": expiry_window},
    }
    table = ddb.Table(table_name)
    table.put_item(Item=ddb_item)

    kds_client = stream_setup(os.environ["STREAM_NAME"])

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
                            "publishedAt": "2021-08-12T22:34:33Z",
                            "textDisplay": "Omg " "love " "it",
                            "textOriginal": "Omg " "love " "it",
                            "updatedAt": "2021-08-12T22:34:33Z",
                            "videoId": video_id,
                            "viewerRating": 2,
                            "likeCount": 0,
                            "updatedAt": datetime.now().strftime(api_response_time_format),
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

    assert None == search_comments(event)


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments_with_page_token(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    table_name = os.environ["TARGET_DDB_TABLE"]
    ddb = ddb_setup(table_name)
    video_id = "fakeVideoId"

    current_time = datetime.now()
    expiry_window = str(
        int((current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp() * 1000)
    )
    ddb_item = {
        "VIDEO_ID": video_id,
        "LAST_QUERIED_TIMESTAMP": (current_time - timedelta(days=2)).isoformat(),
        "EXP_DATE": {"N": expiry_window},
    }
    table = ddb.Table(table_name)
    table.put_item(Item=ddb_item)

    kds_client = stream_setup(os.environ["STREAM_NAME"])

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

    mock_youtube_resource.return_value.commentThreads.return_value.list.return_value.execute.side_effect = [
        {
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
                                "publishedAt": datetime.now().strftime(api_response_time_format),
                                "updatedAt": datetime.now().strftime(api_response_time_format),
                            },
                        },
                        "videoId": video_id,
                    },
                }
            ],
            "kind": "youtube#commentThreadListResponse",
            "pageInfo": {"resultsPerPage": 100, "totalResults": 1},
            "nextPageToken": "fakeToken",
        },
        {
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
                                "publishedAt": datetime.now().strftime(api_response_time_format),
                                "updatedAt": datetime.now().strftime(api_response_time_format),
                            },
                        },
                        "videoId": video_id,
                    },
                }
            ],
            "kind": "youtube#commentThreadListResponse",
            "pageInfo": {"resultsPerPage": 100, "totalResults": 1},
            "nextPageToken": None,
        },
    ]

    assert None == search_comments(event)


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments_with_replies(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    table_name = os.environ["TARGET_DDB_TABLE"]
    ddb = ddb_setup(table_name)
    video_id = "fakeVideoId"

    current_time = datetime.now()
    expiry_window = str(
        int((current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp() * 1000)
    )
    ddb_item = {
        "VIDEO_ID": video_id,
        "LAST_QUERIED_TIMESTAMP": (current_time - timedelta(days=2)).isoformat(),
        "EXP_DATE": {"N": expiry_window},
    }
    table = ddb.Table(table_name)
    table.put_item(Item=ddb_item)

    stream_setup(os.environ["STREAM_NAME"])

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
                            "publishedAt": datetime.now().strftime(api_response_time_format),
                            "updatedAt": datetime.now().strftime(api_response_time_format),
                        },
                    },
                    "videoId": video_id,
                },
                "replies": {
                    "comments": [
                        {
                            "id": "fakeCommentId#fakeCommentId",
                            "kind": "youtube#comment",
                            "snippet": {
                                "textDisplay": "Omg " "love " "it",
                                "textOriginal": "Omg " "love " "it",
                                "videoId": video_id,
                                "viewerRating": 2,
                                "likeCount": 0,
                                "publishedAt": datetime.now().strftime(api_response_time_format),
                                "updatedAt": datetime.now().strftime(api_response_time_format),
                            },
                        }
                    ]
                },
            }
        ],
        "kind": "youtube#commentThreadListResponse",
        "pageInfo": {"resultsPerPage": 100, "totalResults": 1},
        "nextPageToken": None,
    }

    assert None == search_comments(event)


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments_not_publishing_record(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    table_name = os.environ["TARGET_DDB_TABLE"]
    ddb = ddb_setup(table_name)
    video_id = "fakeVideoId"

    current_time = datetime.now()
    expiry_window = str(
        int((current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp() * 1000)
    )
    ddb_item = {
        "VIDEO_ID": video_id,
        "LAST_QUERIED_TIMESTAMP": current_time.isoformat(),
        "EXP_DATE": {"N": expiry_window},
    }
    table = ddb.Table(table_name)
    table.put_item(Item=ddb_item)

    # stream_setup(os.environ["STREAM_NAME"])

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
                            "publishedAt": (current_time - timedelta(days=3)).strftime(api_response_time_format),
                            "updatedAt": (current_time - timedelta(days=2)).strftime(api_response_time_format),
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

    assert None == search_comments(event)


@mock_ssm
@mock_kinesis
@mock_dynamodb2
@patch("util.comment.get_youtube_service_resource")
def test_search_comments_with_api_throws_error(mock_youtube_resource):
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

    import googleapiclient.errors
    import mock

    mock_youtube_resource.return_value.commentThreads.return_value.list.return_value.execute.side_effect = (
        googleapiclient.errors.HttpError(mock.Mock(status=403), "Error invoking API".encode("utf-8"))
    )

    assert None == search_comments(event)


def test_update_text_comment():
    current_time = datetime.now()
    comment = Comment(
        {
            "id": "fakeCommentId",
            "kind": "youtube#comment",
            "snippet": {
                "textDisplay": "Fake Text",
                "textOriginal": "Fake Text",
                "videoId": "fakeVideoId",
                "viewerRating": 2,
                "likeCount": 0,
                "publishedAt": (current_time - timedelta(days=3)).strftime(api_response_time_format),
                "updatedAt": (current_time - timedelta(days=2)).strftime(api_response_time_format),
            },
        }
    )

    updated_text = "new fake text"
    new_comment = comment.update_comment_text(updated_text)

    assert updated_text == new_comment.text
    assert new_comment.comment_id == comment.comment_id
    assert new_comment.viewer_rating == comment.viewer_rating

    new_comment = comment.update_comment_text(updated_text, 2)
    assert new_comment.comment_id == f"{comment.comment_id}#2"


def test_get_split_comments():
    current_time = datetime.now()

    comment_text = ""
    for index in range(500):
        comment_text += "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "

    comment = Comment(
        {
            "id": "fakeCommentId",
            "kind": "youtube#comment",
            "snippet": {
                "textDisplay": "Fake Text",
                "textOriginal": comment_text,
                "videoId": "fakeVideoId",
                "viewerRating": 2,
                "likeCount": 0,
                "publishedAt": (current_time - timedelta(days=3)).strftime(api_response_time_format),
                "updatedAt": (current_time - timedelta(days=2)).strftime(api_response_time_format),
            },
        }
    )

    split_comment = comment.get_split_comments()
    assert len(split_comment) > 10

    split_text = slice_text_into_arrays(comment_text)
    assert split_text[1] == split_comment[1].text


def test_slice_text_into_arrays():
    comment_text = ""
    for index in range(500):
        comment_text += "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "

    split_comment_text = slice_text_into_arrays(comment_text)

    assert split_comment_text[0] == comment_text[0:1250]
    assert split_comment_text[1] == comment_text[1250:2500]
    assert split_comment_text[2] == comment_text[2500:3750]

    assert comment_text == "".join(split_comment_text)
