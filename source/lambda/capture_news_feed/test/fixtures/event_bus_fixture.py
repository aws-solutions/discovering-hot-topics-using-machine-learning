#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import pytest
from botocore.stub import Stubber

event_bus_stubber = None


@pytest.fixture()
def get_event_bus_stubber():
    global event_bus_stubber
    from shared_util.service_helper import get_service_client

    if not event_bus_stubber:
        event_bus_client = get_service_client("events")
        event_bus_stubber = Stubber(event_bus_client)
    return event_bus_stubber
