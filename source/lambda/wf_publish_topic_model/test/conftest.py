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

import pytest


@pytest.fixture(autouse=True)
def aws_credentials():
    """Mocked AWS Credentials"""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_REGION"] = "us-east-1"  # must be a valid region
    os.environ["EVENT_BUS_NAME"] = "test-event-bus"
    os.environ["TOPICS_EVENT_NAMESPACE"] = "com.analyze.inference.topic"
    os.environ["RAW_DATA_FEED"] = "raw-feed"
    os.environ["TOPIC_MAPPINGS_EVENT_NAMESPACE"] = "com.analyze.inference.mapping"
