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
import re

import newscatcher
from shared_util import custom_logging

logger = custom_logging.get_logger(__name__)


def validate_2_char_iso_code(str_iso_code):
    """
    Function to validate that the ISO code specified is 2 characters. The current
    newscatcher library only supports 2 character ISO codes. This is to reduce
    any SQL injection scenarios
    """
    if len(str_iso_code) == 2:
        return re.match(r"[a-zA-Z]{2}", str_iso_code, re.I).string
    else:
        logger.error(f"Not a 2 character ISO code {str_iso_code}")
        raise TypeError((f"Not a 2 character ISO code {str_iso_code}"))


def validate_topic(str_topic):
    topics = [
        "tech",
        "news",
        "business",
        "science",
        "finance",
        "food",
        "politics",
        "economics",
        "travel",
        "entertainment",
        "music",
        "sport",
        "world",
    ]

    if str_topic:
        str_topic_lower = str_topic.lower()

        if str_topic_lower in topics:
            return str_topic_lower
        else:
            logger.error(f"Topic {str_topic} for newscatcher is not valid")
            raise TypeError(f"Topic {str_topic} for newscatcher is not valid")


def retrieve_urls_using_json(param_str):
    """
    This function calls the newscatcher api and returns the urls to be invoked. The
    input parameter is a JSON string which is converted to a dictionary and then processed
    """
    logger.info(f"Parameters to retrieve list of urls to query: {param_str}")

    param_dict = json.loads(param_str)
    country = param_dict.get("country", None)
    language = param_dict.get("language", None)
    topics = param_dict.get("topic", None)

    url_list = list()

    topic_list = None
    if topics:
        topic_list = topics.split(",")

    if topic_list and len(topic_list) > 0 and "ALL" not in topic_list:
        for topic in topic_list:
            temp_url_list = retrieve_urls(
                country=country,
                language=language,
                topic=topic,
            )

            if temp_url_list:
                url_list = url_list + temp_url_list
    else:
        url_list = retrieve_urls(country=country, language=language)

    return url_list


def retrieve_urls(country=None, language=None, topic=None):
    """
    This function calls the newscatcher api and returns the urls to be invoked.
    """
    try:
        if country:
            country = None if country == "ALL" else validate_2_char_iso_code(country)

        if language:
            language = None if language == "ALL" else validate_2_char_iso_code(language)

        if topic:
            topic = None if topic == "ALL" else validate_topic(topic)

        logger.info(f"Parameters to retrieve list are - country:{country}, language:{language}, topic:{topic}")
        url_list = newscatcher.urls(country=country, language=language, topic=topic)
        logger.debug(f"retrieved url list: {url_list}")
        return url_list

    except TypeError:
        logger.error("Fetching urls threw an Error")
        raise
