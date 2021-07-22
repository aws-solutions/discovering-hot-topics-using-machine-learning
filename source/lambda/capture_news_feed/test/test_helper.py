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

import os
from test.test_query_ddb_helper import ddb_setup

import boto3
from moto import mock_dynamodb2
from util.helper import get_service_client, get_service_resource


def test_get_service_client():
    region_name = os.environ["AWS_REGION"]
    client = get_service_client("events")
    assert f"https://events.{region_name}.amazonaws.com" in client.meta.endpoint_url


@mock_dynamodb2
def test_get_service_resource():
    resource = get_service_resource("dynamodb")
    assert not None == resource

    table_name = os.environ["DDB_CONFIG_TABLE_NAME"]
    ddb_setup(table_name)
    table = resource.Table(table_name)
    assert table_name == table.table_name
