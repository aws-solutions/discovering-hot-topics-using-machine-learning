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

import copy
import json
import os
from datetime import datetime, timedelta

import googleapiclient.errors
from shared_util.custom_logging import get_logger

from util import credential_helper, ddb_helper, stream_helper
from util.youtube_service_helper import get_youtube_service_resource

logger = get_logger(__name__)


class Video:
    def __init__(self, video_id, title):
        self.video_id = video_id
        self.title = title


class Comment:
    def __init__(self, comment_response):
        self.text = comment_response["snippet"]["textOriginal"]
        self.comment_id = comment_response["id"]
        self.parent_id = comment_response["snippet"].get("parentId", None)
        self.viewer_rating = comment_response["snippet"]["viewerRating"]
        self.like_count = comment_response["snippet"]["likeCount"]
        self.published_at = comment_response["snippet"]["publishedAt"]
        self.updated_at = comment_response["snippet"]["updatedAt"]

    def update_comment_text(self, text, index=None):
        new_comment = copy.copy(self)
        new_comment.text = text
        if index:
            new_comment.comment_id = f"{self.comment_id}#{index}"
        return new_comment

    def get_split_comments(self):
        split_text = slice_text_into_arrays(self.text)
        split_comment = []
        for item in split_text:
            split_comment.append(self.update_comment_text(item))
        return split_comment


class OutputRecord:
    def __init__(self, video: Video, comment: Comment, search_query):
        self.feed = {}
        self.feed["video_id"] = video.video_id
        self.feed["title"] = video.title
        self.feed["text"] = comment.text
        self.feed["id_str"] = comment.comment_id
        self.feed["parent_id"] = comment.parent_id
        self.feed["viewer_rating"] = comment.viewer_rating
        self.feed["like_count"] = comment.like_count
        self.feed["created_at"] = comment.published_at
        self.feed["updated_at"] = comment.updated_at
        self.platform = "youtubecomments"
        self.account_name = "default"
        self.search_query = search_query


def search_comments(event):
    logger.debug(f"Query handler received event: {json.dumps(event)}")
    youtube = get_youtube_service_resource()

    record = event["detail"]

    search_query = record["SearchQuery"]
    video_id = record["VideoId"]
    title = record["Title"]

    comment_search_params = {
        "part": "snippet, replies",
        "videoId": video_id,
        "maxResults": 100,
        "order": "time",
        "textFormat": "plainText",
    }

    # check for tracker and decide if needs to be published
    tracker = ddb_helper.get_query_timestamp(video_id)
    logger.debug(f"Tracker for VideoId: {video_id} is {tracker}")

    tracker_date = datetime.fromisoformat(tracker["LAST_QUERIED_TIMESTAMP"]) if tracker else None

    while True:
        request = youtube.commentThreads().list(**comment_search_params)
        try:
            youtube_response = request.execute()
            logger.debug(f"Threads, youtube comments {json.dumps(youtube_response)}")

            record_published = process_service_response(youtube_response, search_query, tracker_date, title)
            next_page_token = youtube_response.get("nextPageToken", None)
            logger.debug(f"Next page token is {next_page_token}")
            # This condition optimizes comment thread list, since it seems that the API is returning the most recent ones first
            # this would avoid additional additional iterations to the call if the comment was already ingested based on the
            # tracker date and comments updatedAt timestamp
            if next_page_token and record_published:
                comment_search_params["pageToken"] = next_page_token
            else:
                # update tracker, since loop is over break
                ddb_helper.update_query_timestamp(video_id)
                break
        except googleapiclient.errors.HttpError as error:
            logger.error(
                f"Error occurred when calling list comments for params: {json.dumps(comment_search_params)} and error is {error}"
            )
            break


def process_service_response(youtube_response, search_query, tracker_date, video_title):
    record_published = True

    for item in youtube_response["items"]:
        record_published = process_comment(item["snippet"]["topLevelComment"], search_query, video_title, tracker_date)

        if item.get("replies", None) and item.get("replies").get("comments", None):
            reply_record_published = True

            comments = item.get("replies").get("comments")
            logger.debug(f"Found replies in comments: {json.dumps(comments)}")
            for item_comment in comments:
                reply_record_published = process_comment(item_comment, search_query, video_title, tracker_date)
                if not reply_record_published:
                    break

        if not record_published:
            break

    return record_published


def process_comment(comment_response, search_query, video_title, tracker_date=None):
    comment_updated_date = (
        datetime.strptime(comment_response["snippet"]["updatedAt"], "%Y-%m-%dT%H:%M:%SZ") if tracker_date else None
    )

    if tracker_date == None or (comment_updated_date > tracker_date):
        output_records = get_output_record(comment_response, search_query, video_title)
        for output_record in output_records:
            output_json = output_record.__dict__
            logger.debug(f"Received record for publishing: {json.dumps(output_json)}")
            stream_helper.buffer_data_into_stream(output_json, partition_key=output_json["feed"]["id_str"])

        return True
    else:
        logger.debug("Not publishing the record")
        return False


def get_output_record(comment_response, search_query, video_title):
    comment = Comment(comment_response)
    video = Video(comment_response["snippet"]["videoId"], video_title)

    split_comments = comment.get_split_comments()
    for item in split_comments:
        yield OutputRecord(video, item, search_query)


def slice_text_into_arrays(text):
    # Amazon Comprehend has a size limit of 5000 bytes for async jobs and sync jobs. Hence the need to split
    # an utf-8 or unicode charset can take up to 4 bytes. Each slice cannot be more than 5000.
    # Hence taking 1250 (5000/4) to make sure a slice of a string does not split the bytes of a single character.
    each_string_element_size = 1250
    return [text[i : i + each_string_element_size] for i in range(0, len(text), each_string_element_size)]
