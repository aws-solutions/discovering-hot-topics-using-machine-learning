#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os
import botocore
import pytest
import mock
from botocore.stub import Stubber
from util.event_bridge_util import send_event, EventPublishException


def env_patcher_dict():
    return {
        "INTEGRATION_BUS_NAME": "fakebus",
        "NAMESPACE": "fakenamespace",
    }


def get_json_payload():
    # generate fake json payload
    return {
        "fakekey1": "fakeValue1",
        "fakekey2": "fakeValue2",
        "fakekey3": "fakeValue3",
    }


event_bus_stubber = None


@pytest.fixture
def get_event_bus_stubber():
    global event_bus_stubber
    from shared_util.service_helper import get_service_client

    if not event_bus_stubber:
        event_bus_client = get_service_client("events")
        event_bus_stubber = Stubber(event_bus_client)
    return event_bus_stubber


@mock.patch.dict(os.environ, env_patcher_dict())
def test_send_event(get_event_bus_stubber):
    payload = json.dumps(get_json_payload())
    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
        {
            "Entries": [
                {
                    "EventBusName": os.environ["INTEGRATION_BUS_NAME"],
                    "Source": os.environ["NAMESPACE"],
                    "Detail": payload,
                    "DetailType": "fakedetailtype",
                }
            ]
        },
    )

    get_event_bus_stubber.activate()
    response = send_event(payload, "fakedetailtype", os.environ["NAMESPACE"])

    assert response["FailedEntryCount"] == 0

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock.patch.dict(os.environ, env_patcher_dict())
def test_send_failure(get_event_bus_stubber):
    payload = json.dumps(get_json_payload())
    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 1},
        {
            "Entries": [
                {
                    "EventBusName": os.environ["INTEGRATION_BUS_NAME"],
                    "Source": os.environ["NAMESPACE"],
                    "Detail": payload,
                    "DetailType": "fakedetailtype",
                }
            ]
        },
    )

    get_event_bus_stubber.activate()

    try:
        response = send_event(payload, "fakedetailtype", os.environ["NAMESPACE"])
    except EventPublishException as e:
        assert str(e) == f"Following record failed publishing {payload}"

    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()
