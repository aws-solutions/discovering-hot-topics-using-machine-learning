#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
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
    os.environ["AWS_SDK_USER_AGENT"] = '{ "user_agent_extra": "solution/fakeID/fakeVersion" }'
