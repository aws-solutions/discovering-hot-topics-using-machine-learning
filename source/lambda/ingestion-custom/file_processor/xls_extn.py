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

import datetime
import os

import botocore
import openpyxl
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_client, get_service_resource
from shared_util.stream_helper import buffer_data_into_stream
from util import helpers, s3_util
from util.constants import TIMESTAMP_FORMAT, ACCOUNT_NAME, CREATED_DATE, ID, LANG, PLATFORM, TEXT
from file_processor.file_processor import (
    FileProcessor,
    FileProcessorBuilder,
)

logger = get_logger(__name__)


class ExcelFileProcessor(FileProcessor):
    def __init__(
        self, id_key, created_date_key, text_key, lang_key, account_name_value, platform_value, header_list=None
    ):
        super().__init__(
            id_key,
            created_date_key,
            text_key,
            lang_key,
            account_name_value,
            platform_value,
        )
        self.included_keys = [self.created_date_key, self.text_key, self.lang_key]
        self.header_list = header_list

    def process_file(self, bucket_name: str, key_prefix: str):
        file_path = s3_util.download_file(bucket_name, key_prefix)

        """
        Open the excel file for reading worksheet. Only supports reading the first worksheet. Also the sheet is
        expected to have only data, for security reason any links, VBA scripts or calculation are disabled
        """
        workbook = openpyxl.load_workbook(filename=file_path, read_only=True, data_only=True)
        worksheet = workbook.worksheets[0]
        self.header_list = list(map(lambda x: x.value, worksheet[1]))

        """ Process each row of the worksheet. Assuming that it has a header, reading from 2nd row """
        for row in worksheet.iter_rows(min_row=2, values_only=True):
            data = self.transform_row(row)
            data["source_file"] = os.path.basename(file_path)
            buffer_data_into_stream(data, partition_key=data["feed"]["id_str"])

        # now since the file is processed, delete the file. This would ensure if the same lambda instance is used,
        # it would not have the same file in the /tmp directory
        os.remove(file_path)
        s3_util.tag_file_as_processed(bucket_name, key_prefix)  # tag file in s3 that processing is complete

    def transform_row(self, row):
        """Select colums using the lambda environment variables configuration and create the JSON"""
        feed = {}

        feed["id_str"] = "#".join(x for x in map(lambda x: str(row[x]), self.id_key))
        logger.debug(f"ID is {feed['id_str']}")
        created_at_value = row[self.created_date_key]
        if isinstance(created_at_value, datetime.datetime):
            feed["created_at"] = created_at_value.strftime(
                TIMESTAMP_FORMAT
            )  # date should be in YYYY-MM-DD HH:MM:SS format
        else:
            feed["created_at"] = created_at_value
        logger.debug(f"Text is {row[self.text_key]}")
        feed["text"] = helpers.strip_html(row[self.text_key])
        # 2-character language code, assuming the first two character from en_US
        feed["lang"] = row[self.lang_key][:2]

        # Add rest of the values to the dict
        column_length = len(row)
        for column_index in range(column_length):
            if column_index not in self.included_keys:
                value = row[column_index]
                if isinstance(value, datetime.datetime):
                    feed[self.header_list[column_index]] = (
                        value.strftime(TIMESTAMP_FORMAT)[:-3] + "Z"
                    )  # date should be in YYYY-MM-DDTHH:MM:SS.000Z format
                else:
                    logger.debug(f"Header at {column_index} is {self.header_list[column_index]}")
                    feed[self.header_list[column_index]] = value

        json_record = {}
        json_record["account_name"] = self.account_name_value
        json_record["platform"] = self.platform_value
        # The search query does not apply to custom ingestion but is required for merging
        # the JSON outputs in the step function workflow
        json_record["search_query"] = ""
        json_record["feed"] = feed
        logger.debug(json_record)
        return json_record


class ExcelFileProcessorBuilder(FileProcessorBuilder):
    def __call__(self):
        if not self._process_instance:
            super()._is_env_setup()
            """Retrieve column mappings and initialize the settings for processing"""
            self._process_instance = ExcelFileProcessor(
                [int(id) for id in os.environ[ID].split(",")],
                int(os.environ[CREATED_DATE]),
                int(os.environ[TEXT]),
                int(os.environ[LANG]),
                os.environ[ACCOUNT_NAME],
                os.environ[PLATFORM],
            )
        return self._process_instance
