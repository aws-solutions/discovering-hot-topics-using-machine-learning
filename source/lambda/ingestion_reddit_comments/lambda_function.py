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

import praw
import os

from shared_util import custom_logging
from util.reddit_util import get_tracker_state, get_reddit_credentials, update_tracker_state
from util.reddit_exception import InvalidConfigurationError
from util.stream_comment import publish_comment, publish_records_to_kinesis

TERMINATION_INTERVAL = 10000
logger = custom_logging.get_logger(__name__)


def handler(event, context):
    check_env_setup()
    subreddit = event['detail']['name']
    logger.info(f"Processing comments for subreddit : {subreddit}")
    get_comments(subreddit, context)


def get_comments(subreddit_name, context):
    before = get_tracker_state(subreddit_name)
    reddit_creds = get_reddit_credentials()
    reddit = praw.Reddit(client_id=reddit_creds['clientId'],
                         client_secret=reddit_creds['clientSecret'],
                         refresh_token=reddit_creds['refreshToken'],
                         user_agent=reddit_creds['userAgent'])
    subreddit = reddit.subreddit(subreddit_name[len('r/'):])
    comments = list(subreddit.comments(
        **{"limit": 100, "params": {"before": before}}))
    if len(comments) == 0:
        # Traverse comments in backwards direction from latest comment
        logger.info(
            f"Traverse comments in reverse direction, before is {before}")
        before = traverse_comments_reverse(
            subreddit, subreddit_name, before, context)
        comments = list(subreddit.comments(
            **{"limit": 100, "params": {"before": before}}))
        if len(comments) == 0:
            return
    try:
        while True:
            before = process_comments(comments)
            comments = list(subreddit.comments(
                **{"limit": 100, "params": {"before": before}}))
            if len(comments) == 0:
                logger.info(
                    f"No comments found for {subreddit_name} and hence terminating")
                break
            if context.get_remaining_time_in_millis() < TERMINATION_INTERVAL:
                break
    except Exception as exception:
        logger.error(
            f"Error processing comments, error is: {exception}")
        raise exception
    finally:
        if before is not None:
            update_tracker_state(subreddit_name, before)
        publish_records_to_kinesis()


def process_comments(comments):
    first = True
    before = None
    for comment in comments:
        if first:
            before = comment.name
            first = False
        publish_comment(vars(comment), False)
    return before


def traverse_comments_reverse(subreddit, subreddit_name, before, context):
    after = None
    terminate = False
    first = True
    new_before = None
    try:
        while not terminate:
            comments = list(subreddit.comments(
                **{"limit": 100, "params": {"after": after}}))
            if len(comments) == 0:
                logger.info("No further comments found")
                break
            if first:
                new_before = comments[0].name
                first = False
            for comment in comments:
                if before == comment.name:
                    terminate = True
                    break
                publish_comment(vars(comment), False)
            after = comments[-1].name
            if context.get_remaining_time_in_millis() < TERMINATION_INTERVAL:
                break
    except Exception as exception:
        logger.error(
            f"Error processing comments, error is: {exception}")
        raise exception
    finally:
        if before != new_before:
            update_tracker_state(subreddit_name, new_before)
            publish_records_to_kinesis()
    return new_before


def check_env_setup():
    if (not os.environ["TARGET_DDB_TABLE"] or not os.environ["REDDIT_API_KEY"] or not os.environ["SOLUTION_VERSION"]
            or not os.environ["STACK_NAME"] or not os.environ["SOLUTION_ID"] or not os.environ["STREAM_NAME"]):
        raise InvalidConfigurationError(
            "Some or all of environment variables not set. Please check if TARGET_DDB_TABLE, REDDIT_API_KEY, SOLUTION_VERSION, STACK_NAME, SOLUTION_ID and STREAM_NAME variables are set with appropriate values")
