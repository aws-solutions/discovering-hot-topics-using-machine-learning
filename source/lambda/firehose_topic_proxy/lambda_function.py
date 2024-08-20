#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os

from shared_util import custom_logging

from util.topic import store_mappings, store_topics

logger = custom_logging.get_logger(__name__)


def handler(event, _):
    if event["source"] == os.environ["TOPICS_NS"]:
        logger.debug("Event namespace is " + os.environ["TOPICS_NS"])
        store_topics(event["detail"])
    elif event["source"] == os.environ["TOPIC_MAPPINGS_NS"]:
        logger.debug("Event namespace is " + os.environ["TOPIC_MAPPINGS_NS"])
        store_mappings(event["detail"])
    else:
        logger.warn("Event source matched no namespace")
