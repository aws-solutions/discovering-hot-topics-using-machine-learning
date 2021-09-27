#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                     #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import os

from shared_util import custom_logging

from util.topic import store_mappings, store_topics

logger = custom_logging.get_logger(__name__)


def handler(event, context):
    if event["source"] == os.environ["TOPICS_NS"]:
        logger.debug("Event namespace is " + os.environ["TOPICS_NS"])
        store_topics(event["detail"])
    elif event["source"] == os.environ["TOPIC_MAPPINGS_NS"]:
        logger.debug("Event namespace is " + os.environ["TOPIC_MAPPINGS_NS"])
        store_mappings(event["detail"])
    else:
        logger.warn("Event source matched no namespace")
