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
from unittest import TestCase, mock
from moto import mock_s3, mock_kinesis

from shared_util.custom_logging import get_logger

from file_processor.file_processor import ACCOUNT_NAME, CREATED_DATE, ID, LANG, PLATFORM, TEXT
from file_processor.json_extn import JSONFileProcessor, JSONFileProcessorBuilder

from test.test_s3_util import MOCK_BUCKET, MOCK_JSON_FILE_PREFIX, MOCK_MULTI_JSON_FILE_PREFIX, s3_setup, s3_tear_down
from test.test_lambda_function import stream_setup, stream_tear_down

logger = get_logger(__name__)


def env_patcher_dict():
    """
    Method that setups environment variables for creation of 'Processor' instance.
    These values are based on the mock_data_file.xlsx file the fixtures directory.
    Any structural changes to that file would need updating this dictionary
    """
    return {
        ID: "id",
        CREATED_DATE: "created_date",
        TEXT: "content",
        LANG: "lang",
        ACCOUNT_NAME: "fakeaccount",
        PLATFORM: "fakeplatform",
        "LIST_SELECTOR": "list_contents",
    }


class TestJSONExtn(TestCase):
    def setUp(self):
        super().setUp()

    @classmethod
    def setUpClass(cls):
        # patch environment variables for xls file processor
        cls.env_patcher = mock.patch.dict(os.environ, env_patcher_dict())
        cls.env_patcher.start()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls.env_patcher.stop()

    def tearDown(self):
        super().tearDown()


class TestJSONFileProcessor(TestJSONExtn):
    def __init__(self, *args, **kwargs):
        super(TestJSONFileProcessor, self).__init__(*args, **kwargs)
        self._processor = None

    def setUp(self):
        self._processor = JSONFileProcessor(
            os.environ[ID],
            os.environ[CREATED_DATE],
            os.environ[TEXT],
            os.environ[LANG],
            os.environ[ACCOUNT_NAME],
            os.environ[PLATFORM],
            list_selector=os.environ["LIST_SELECTOR"],
        )

    @mock_s3()
    @mock_kinesis()
    def test_process_mutli_json_file(self):
        s3_setup()
        stream_setup(os.environ["STREAM_NAME"])
        self._processor.process_file(MOCK_BUCKET, MOCK_MULTI_JSON_FILE_PREFIX)
        s3_tear_down()
        stream_tear_down(os.environ["STREAM_NAME"])

    @mock_s3()
    @mock_kinesis()
    def test_process_single_json_file(self):
        s3_setup()
        stream_setup(os.environ["STREAM_NAME"])
        with mock.patch.dict("os.environ"):
            del os.environ["LIST_SELECTOR"]
            self.assertIsNone(os.environ.get("LIST_SELECTOR"))
            single_record_processor = JSONFileProcessor(
                os.environ[ID],
                os.environ[CREATED_DATE],
                os.environ[TEXT],
                os.environ[LANG],
                os.environ[ACCOUNT_NAME],
                os.environ[PLATFORM],
            )
            single_record_processor.process_file(MOCK_BUCKET, MOCK_JSON_FILE_PREFIX)
        s3_tear_down()
        stream_tear_down(os.environ["STREAM_NAME"])


class TestJSONFileProcessorBuilder(TestJSONExtn):
    def test_mock_env_setup(self):
        # test if the mock.patch for environment variables has been patched correctly
        self.assertEqual(os.environ["LIST_SELECTOR"], "list_contents")
        self.assertEqual(os.environ[ID], "id")
        self.assertEqual(os.environ[CREATED_DATE], "created_date")
        self.assertEqual(os.environ[TEXT], "content")
        self.assertEqual(os.environ[LANG], "lang")
        self.assertEqual(os.environ[ACCOUNT_NAME], "fakeaccount")
        self.assertEqual(os.environ[PLATFORM], "fakeplatform")

    def test_retrieving_process_instance(self):
        # check if builder is able to return instance successfully
        builder = JSONFileProcessorBuilder()
        self.assertTrue(isinstance(builder, JSONFileProcessorBuilder))
        self.assertTrue(isinstance(builder(), JSONFileProcessor))

    def test_processor_instance(self):
        """
        The builder should return the same instance of the process or through the
        __call__ method. The check here is to check the memory address of the instance to know if the instance
        is the same.
        """
        builder = JSONFileProcessorBuilder()
        self.assertIsNotNone(builder())
        self.assertTrue(id(builder()) == id(builder()))
        self.assertFalse(
            id(builder())
            == id(
                JSONFileProcessor(
                    os.environ[ID],
                    os.environ[CREATED_DATE],
                    os.environ[TEXT],
                    os.environ[LANG],
                    os.environ[ACCOUNT_NAME],
                    os.environ[PLATFORM],
                    list_selector=os.environ["LIST_SELECTOR"],
                )
            )
        )
