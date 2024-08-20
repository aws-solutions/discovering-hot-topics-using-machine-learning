######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os
import unittest

import mock
import pytest
from botocore import config
from shared_util import custom_boto_config


class CustomConfigTestCase(unittest.TestCase):
    def test_custom_config(self):
        custom_config = custom_boto_config.init()
        self.assertIsNotNone(custom_config)
        self.assertIsInstance(custom_config, config.Config)

    @mock.patch("botocore.config.Config")
    def test_function_param_validation(self, mocked):
        custom_boto_config.init()
        mocked.assert_called_once_with(
            region_name="us-east-1",
            retries={"max_attempts": 10, "mode": "standard"},
            user_agent_extra="solution/fakeID/fakeVersion",
        )

    @mock.patch("botocore.config.Config")
    def test_min_sdk_usr_agent_set(self, mocked):
        custom_boto_config.init()
        args, kwargs = mocked.call_args
        self.assertTrue(kwargs["user_agent_extra"], "solution/fakeID/fakeVersion")
