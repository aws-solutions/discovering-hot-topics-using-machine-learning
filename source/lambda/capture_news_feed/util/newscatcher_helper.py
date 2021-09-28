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
from datetime import date, datetime, timezone
from urllib.parse import urlparse

from shared_util import custom_logging
from newscatcher import Newscatcher

from util import stream_helper

logger = custom_logging.get_logger(__name__)

rss_datetime_fromat_1 = "%a, %d %b %Y %H:%M:%S %z"
rss_datetime_fromat_2 = "%a, %d %b %Y %H:%M:%S %Z"
rss_datetime_fromat_3 = "%a, %d %b %Y %H:%M:%S"


class TopicNotSupportedError(Exception):
    pass


def get_topic_list():
    return [
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


def retrieve_feed_from_all_topics(url):
    topic_list = get_topic_list()
    aggregated_feed = []
    for topic in topic_list:
        try:
            aggregated_feed.append(retrieve_feed(url, topic=topic))
        except TopicNotSupportedError as error:
            logger.warn(f"Skipping topic {topic} for {url} because {error}")

    return aggregated_feed


def try_parsing_published_date(articles):
    for feed in list(articles):
        if not feed.get("published", None):
            if feed.get("id", None):
                parsed_date = urlparse(feed["id"]).path.split("/")[1:4]
                try:
                    d = date(int(parsed_date[0]), int(parsed_date[1]), int(parsed_date[2]))
                    feed["published"] = f"{d.strftime(rss_datetime_fromat_1)}+0000"
                    feed["published_parsed"] = [
                        d.year,
                        d.month,
                        d.day,
                        0,
                        0,
                        0,
                        d.weekday(),
                        d.timetuple().tm_yday,
                        0,
                    ]
                except ValueError:
                    logger.error(
                        f"Removing article with no published date or url path to infer a published date {json.dumps(feed)}"
                    )
                    articles.remove(feed)
            else:
                # Do not process the article because could not infer published date and may result in duplicate processing
                logger.error(
                    f"Removing article with no published date or url path to infer a published date {json.dumps(feed)}"
                )
                articles.remove(feed)

    return articles


def retrieve_feed(url, topic=None):
    """
    This method retrieve the news articles using Newscatcher API. If not topic
    is passed, topic is None and the library defaults to the main topics that
    are published which are 'News' in most cases

    """
    nc = Newscatcher(website=url, topic=topic)
    news_feeds = nc.get_news()
    # patch for cnn.com/tech rss feeds since they don't have the "published" date. Taking date from url path
    if url == "cnn.com" and news_feeds:
        news_feeds["articles"] = try_parsing_published_date(news_feeds["articles"])

    if not news_feeds:
        logger.warn(f"Topic {topic} is not supported")
        raise TopicNotSupportedError(f"Topic {topic} is not supported")
    return news_feeds


def get_published_timestamp(str_date):
    published_datetime = None
    try:
        published_datetime = datetime.strptime(str_date, rss_datetime_fromat_1)
    except ValueError:
        try:
            published_datetime = datetime.strptime(str_date, rss_datetime_fromat_2)
        except ValueError:
            published_datetime = datetime.strptime(str_date, rss_datetime_fromat_3)

    return published_datetime.replace(tzinfo=timezone.utc)


def get_published_parsed_timestamp(parsed_date):
    return datetime(
        parsed_date[0],
        parsed_date[1],
        parsed_date[2],
        parsed_date[3],
        parsed_date[4],
        parsed_date[5],
        0,
        tzinfo=timezone.utc,
    )


def create_and_publish_record(news_feed, account_name, platform, last_published_timestamp=None, query_str=None):
    language = news_feed["language"]
    url = news_feed["url"]
    country = news_feed["country"]
    topic = news_feed["topic"]
    articles = news_feed["articles"]

    query_str_list = query_str.split(",") if query_str else []

    # strip off html tags and other html tags starting with '&' and '#' present in regular text from RSS feeds controlled by
    # a list of sites stored in SQLLite. Any ReDoS attack may stop ingestion of news feeds, with lambda timing out for a
    # specific RSS provider site
    cleanr = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")  # NOSONAR - Rule python:S4784.

    for article in articles:
        published_timestamp = None
        try:
            published_timestamp = news_feed_timestamp(article)
        except ValueError:
            logger.warn(f"Cannot parse published timestamp for {article}")
            continue

        if not last_published_timestamp or published_timestamp > datetime.fromisoformat(last_published_timestamp):
            # check if at least one element of list is present in the article summary else skip this article
            if len(query_str_list) > 0 and not any(keyword in article["summary"] for keyword in query_str_list):
                logger.debug("Did not find {query_str} in {article}")
                # Moving to next article since it did not have any of the search key words
                continue

            text = article["summary"]
            clean_text = re.sub(cleanr, "", text)
            text_array = slice_text_into_arrays(clean_text)

            # TODO - move the entities and extended entities to a function
            # populate image urls
            id_str = f"{str(int(datetime.now().timestamp() * 1000))}#{url}"
            image_urls = filter_link_types(article["links"], "image/jpeg")
            entities, extended_entities = dict(), dict()
            entities["media"], extended_entities["media"] = image_urls, image_urls

            # populate text urls
            text_urls = filter_link_types(article["links"], "text/html")
            entities["urls"], extended_entities["urls"] = text_urls, text_urls
            publish_record(
                {
                    "account_name": account_name,
                    "platform": platform,
                    "search_query": query_str,
                    "feed": {
                        "created_at": published_timestamp.isoformat(),
                        "entities": entities,
                        "extended_entities": extended_entities,
                        "lang": language,
                        "metadata": {"website": url, "country": country, "topic": topic},
                    },
                },
                id_str,
                text_array,
            )


def publish_record(record_to_publish, id_str, text_array):
    for index, text in enumerate(text_array):
        # creating the final event
        record_to_publish["feed"]["id_str"] = f"{id_str}#{index}"
        record_to_publish["feed"]["text"] = text

        logger.debug(f"Publishing record: {record_to_publish}")

        """ Buffer text content to Kinesis Data Streams """
        stream_helper.buffer_data_into_stream(record_to_publish, partition_key=id_str)


def news_feed_timestamp(article):
    published_timestamp = None
    published_parsed = article.get("published_parsed", None)
    if published_parsed:
        published_timestamp = get_published_parsed_timestamp(published_parsed)
    else:
        # sample published time stamp Thu, 18 Mar 2021 20:06:58 +0200
        try:
            published_timestamp = get_published_timestamp(article["published"])
        except ValueError:
            logger.error(f"Could not parse time information and hence skipping record {article}")
            raise ValueError
    return published_timestamp


def slice_text_into_arrays(text):
    # Amazon Comprehend has a size limit of 5000 bytes for async jobs and sync jobs. Hence the need to split
    # an utf-8 or unicode charset can take up to 4 bytes. Each slice cannot be more than 5000.
    # Hence taking 1250 (5000/4) to make sure a slice of a string does not split the bytes of a single character.
    each_string_element_size = 1250
    return [text[i : i + each_string_element_size] for i in range(0, len(text), each_string_element_size)]


def filter_link_types(links, content_type):
    media_list = list(filter(lambda link: content_type in link["type"], links))
    response_list = list()
    for media in media_list:
        if "image" in content_type:
            response_list.append({"media_url_https": media["href"], "type": content_type})
        elif "text" in content_type:
            response_list.append({"expanded_url": media["href"]})
        else:
            logger.error(f"This function does not process type: {content_type} links")
            raise TypeError(f"This function does not process type: {content_type} links")

    return response_list
