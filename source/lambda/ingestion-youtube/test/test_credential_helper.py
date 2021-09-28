#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed underthe Apache License, Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import os
import unittest

import boto3
import botocore
from moto import mock_ssm
from shared_util import custom_boto_config
from util import credential_helper


@mock_ssm
def ssm_setup(api_key):
    ssm_client = boto3.client("ssm", config=custom_boto_config.init())
    ssm_client.put_parameter(Name=os.environ["SSM_API_KEY"], Type="SecureString", Value=api_key)
    return ssm_client


@mock_ssm
class TestCredentialHelper(unittest.TestCase):
    def setUp(self):
        self.set_api_key = "fakeapikey"
        self.ssm = ssm_setup(self.set_api_key)

    def tearDown(self):
        self.ssm.delete_parameter(Name=os.environ["SSM_API_KEY"])

    def test_get_api_key(self):
        returned_api_key = credential_helper.get_api_key()
        self.assertEqual(returned_api_key, self.set_api_key)

    def test_error_get_api_key(self):
        os.environ.pop("SSM_API_KEY")
        self.assertRaises(Exception, credential_helper.get_api_key)
        os.environ["SSM_API_KEY"] = "fakessmapikey"
