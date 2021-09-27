######################################################################################################################
#  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      #
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
