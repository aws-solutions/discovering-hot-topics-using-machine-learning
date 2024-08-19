######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os
import unittest

import boto3
import botocore
import mock
import pytest
from moto import mock_dynamodb
from shared_util import custom_boto_config, service_helper


@mock_dynamodb
def ddb_setup(table_name):
    ddb = boto3.resource("dynamodb", config=custom_boto_config.init())
    table = ddb.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": "ID", "KeyType": "HASH"},
            {"AttributeName": "LAST_PUBLISHED_TIMESTAMP", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "ID", "AttributeType": "S"},
            {"AttributeName": "LAST_PUBLISHED_TIMESTAMP", "AttributeType": "S"},
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )

    return ddb


class ServiceHelperTestCase(unittest.TestCase):
    def test_service_client(self):
        service_client = service_helper.get_service_client("s3")
        self.assertIsNotNone(service_client)
        self.assertTrue("https://s3." in service_client.meta.endpoint_url)

    @mock_dynamodb
    def test_get_service_resource(self):
        service_resource = service_helper.get_service_resource("dynamodb")
        self.assertIsNotNone(service_resource)

        table_name = os.environ["DDB_TABLE_NAME"]
        ddb_setup(table_name)
        table = service_resource.Table(table_name)
        assert table_name == table.table_name
