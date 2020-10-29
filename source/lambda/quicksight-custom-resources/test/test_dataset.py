#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICNSE-2.0                                                                     #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import test.logger_test_helper
import logging
import pytest
from moto import mock_sts

from util.datasource import DataSource
from util.dataset import DataSet
from util.quicksight_resource import ResourceSubTypeError

from test.fixtures.quicksight_dataset_fixtures import (
    DataSetStubber,
    data_set_type,
    quicksight_create_data_set_stubber,
    quicksight_data_set_stubber,
    quicksight_delete_data_set_stubber
)
from test.fixtures.quicksight_test_fixture import quicksight_application_stub

from test.logger_test_helper import dump_state

logger = logging.getLogger(__name__)

@ mock_sts
def test_data_set_init_all_data_set_types(data_set_type, quicksight_application_stub):
    data_source = DataSource(quicksight_application=quicksight_application_stub, props=None)
    data_set = DataSet(
        data_source=data_source,
        data_set_sub_type=data_set_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )
    dump_state(data_set, 'After initialization')

@ mock_sts
def test_data_set_create_all_data_set_types(data_set_type, quicksight_application_stub):
    data_source = DataSource(quicksight_application=quicksight_application_stub, props=None)

    # stub
    data_source.arn = "STUBBED_DATA_SOURCE_ARN"
    quicksight_application_stub.data_source = data_source

    data_set = DataSet(
        data_source=data_source,
        data_set_sub_type=data_set_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )

    dump_state(data_set, 'Before create')
    DataSetStubber.stub_create_data_set(data_set_type)
    data_set.create()
    dump_state(data_set, 'After create')

@ mock_sts
def test_data_set_delete_all_data_set_types(data_set_type, quicksight_application_stub):
    data_source = DataSource(quicksight_application=quicksight_application_stub, props=None)

    # stub
    data_source.arn = "STUBBED_DATA_SOURCE_ARN"
    quicksight_application_stub.data_source = data_source

    logger.info(f'Initializing dataset object for type: {data_set_type}')
    data_set = DataSet(
        data_source=data_source,
        data_set_sub_type=data_set_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )
    logger.debug(f'After initializing dataset object for type: {data_set_type}')

    dump_state(data_set, 'Before delete')
    DataSetStubber.stub_delete_data_set(data_set_type)
    data_set.delete()
    dump_state(data_set, 'After delete')

@ mock_sts
def test_data_set_missing_data_source(quicksight_application_stub):
    missing_data_source = None
    data_set = DataSet(
        data_source=missing_data_source,
        data_set_sub_type=data_set_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )
    with pytest.raises(ValueError):
        data_set.create()

@ mock_sts
def test_data_set_invalid_sub_type(quicksight_application_stub):
    data_source = DataSource(quicksight_application=quicksight_application_stub, props=None)
    invalid_sub_type = 'TEST_INVALID_SUB_TYPE'
    data_set = DataSet(
        data_source=data_source,
        data_set_sub_type=invalid_sub_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )
    with pytest.raises(Exception):
        data_set.create()

@ mock_sts
def test_data_set_get_data(quicksight_application_stub, data_set_type):
    data_source = DataSource(quicksight_application=quicksight_application_stub, props=None)
    data_set = DataSet(
        data_source=data_source,
        data_set_sub_type=data_set_type,
        data_set_name=f"_{data_set_type}_DataSet",
        props=None,
        quicksight_application=quicksight_application_stub
    )
    assert repr(data_set) == "{'id': 'DHT_Unit_Test_dataset', 'name': 'DHT_Unit_Test_dataset', 'arn': None}"
