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
import openpyxl

from unittest import TestCase, mock
from moto import mock_s3, mock_kinesis

from util import helpers
from file_processor.file_processor import ACCOUNT_NAME, CREATED_DATE, ID, LANG, PLATFORM, TEXT
from file_processor.xls_extn import ExcelFileProcessorBuilder, ExcelFileProcessor
from test.test_s3_util import MOCK_BUCKET, MOCK_XLSX_FILE_PREFIX, s3_setup, s3_tear_down
from test.test_lambda_function import stream_setup, stream_tear_down


def env_patcher_dict():
    """
    Method that setups environment variables for creation of 'Processor' instance.
    These values are based on the mock_data_file.xlsx file the fixtures directory.
    Any structural changes to that file would need updating this dictionary
    """
    return {ID: "0", CREATED_DATE: "1", TEXT: "2", LANG: "3", ACCOUNT_NAME: "fakeaccount", PLATFORM: "fakeplatform"}


class TestXlsExtn(TestCase):
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


class TestXlsExtnProcessor(TestXlsExtn):
    def __init__(self, *args, **kwargs):
        super(TestXlsExtnProcessor, self).__init__(*args, **kwargs)
        self._processor = None
        self._worksheet = None

    def setUp(self):
        workbook = openpyxl.load_workbook(
            filename=os.path.join(os.path.dirname(__file__), "fixtures", MOCK_XLSX_FILE_PREFIX),
            read_only=True,
            data_only=True,
        )
        self._worksheet = workbook.worksheets[0]

        self._processor = ExcelFileProcessor(
            [int(id) for id in os.environ[ID].split(",")],
            int(os.environ[CREATED_DATE]),
            int(os.environ[TEXT]),
            int(os.environ[LANG]),
            os.environ[ACCOUNT_NAME],
            os.environ[PLATFORM],
            list(map(lambda x: x.value, self._worksheet[1])),
        )

    def test_transform_row(self):
        for row in self._worksheet.iter_rows(min_row=2, values_only=True):
            json_record = self._processor.transform_row(row)

            # assert if the values from the excel sheet exist in the appropriate keys in the JSON
            self.assertEqual(
                json_record["feed"]["id_str"],
                "#".join(x for x in map(lambda x: str(row[x]), [int(id) for id in os.environ[ID].split(",")])),
            )
            self.assertEqual(json_record["feed"]["text"], helpers.strip_html(row[int(os.environ[TEXT])]))
            self.assertEqual(json_record["feed"]["lang"], row[int(os.environ[LANG])][:2])
            self.assertEqual(json_record["search_query"], "")
            self.assertEqual(json_record["account_name"], os.environ[ACCOUNT_NAME])
            self.assertEqual(json_record["platform"], os.environ[PLATFORM])

    @mock_s3()
    @mock_kinesis()
    def test_process_file(self):
        # setup s3 and kinesis stream and then process the file
        s3_setup()
        stream_setup(os.environ["STREAM_NAME"])
        self._processor.process_file(MOCK_BUCKET, MOCK_XLSX_FILE_PREFIX)
        s3_tear_down()
        stream_tear_down(os.environ["STREAM_NAME"])


class TestXlsExtnProcessorBuilder(TestXlsExtn):
    def test_mock_env_setup(self):
        # test if the mock.patch for environment variables has been patched correctly
        self.assertEqual(os.environ[ID], "0")
        self.assertEqual(os.environ[CREATED_DATE], "1")
        self.assertEqual(os.environ[TEXT], "2")
        self.assertEqual(os.environ[LANG], "3")
        self.assertEqual(os.environ[ACCOUNT_NAME], "fakeaccount")
        self.assertEqual(os.environ[PLATFORM], "fakeplatform")

    def test_retrieving_process_instance(self):
        # check if builder is able to return instance successfully
        builder = ExcelFileProcessorBuilder()
        self.assertTrue(isinstance(builder, ExcelFileProcessorBuilder))

    def test_processor_instance(self):
        """
        The builder should return the same instance of the process or through the
        __call__ method. The check here is to check the memory address of the instance to know if the instance
        is the same.
        """
        builder = ExcelFileProcessorBuilder()
        self.assertIsNotNone(builder())
        self.assertTrue(id(builder()) == id(builder()))
        self.assertFalse(
            id(builder())
            == id(
                ExcelFileProcessor(
                    [int(id) for id in os.environ[ID].split(",")],
                    int(os.environ[CREATED_DATE]),
                    int(os.environ[TEXT]),
                    int(os.environ[LANG]),
                    os.environ[ACCOUNT_NAME],
                    os.environ[PLATFORM],
                )
            )
        )
