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

import pytest
from botocore.stub import Stubber
from shared_util.service_helper import get_service_client

event_bus_stubber = None


@pytest.fixture()
def get_event_bus_stubber():
    global event_bus_stubber

    if not event_bus_stubber:
        event_bus_client = get_service_client("events")
        event_bus_stubber = Stubber(event_bus_client)
    return event_bus_stubber