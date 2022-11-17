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
import pathlib

from shared_util.custom_logging import get_logger

from file_processor.file_processor import FileProcessor
from file_processor.processor_factory import FileProcessorFactory
from file_processor.xls_extn import ExcelFileProcessorBuilder
from file_processor.transcribe_call_analytics import TranscribeCallAnalyticsBuilder

from file_processor.json_extn import JSONFileProcessorBuilder

logger = get_logger(__name__)

# file extension constants
JSON_FILE_EXTN = ".json"
EXCEL_FILE_EXTN = ".xls"
EXCELX_FILE_EXTN = ".xlsx"

# processor constants
TRANSCRIBE_CALL_ANALYTICS = "TRANSCRIBE_CALL_ANALYTICS"

factory = FileProcessorFactory()
factory.register_processor_for_file_format(EXCEL_FILE_EXTN, ExcelFileProcessorBuilder)
factory.register_processor_for_file_format(EXCELX_FILE_EXTN, ExcelFileProcessorBuilder)
factory.register_processor_for_file_format(JSON_FILE_EXTN, JSONFileProcessorBuilder)
factory.register_processor_for_file_format(TRANSCRIBE_CALL_ANALYTICS, TranscribeCallAnalyticsBuilder)


def handler(event, _):
    logger.debug(f"Received event: {event}")
    bucket_name = event["detail"]["bucket"]["name"]
    bucket_key_prefix = event["detail"]["object"]["key"]

    if os.environ.get("PROCESSOR_TYPE", None):
        processor_type = os.environ["PROCESSOR_TYPE"]
        logger.debug(f"Found environment variable {processor_type}, set for processor type ")
    else:
        logger.debug(f"Received S3 notification for bucket: {bucket_name} with prefix:{bucket_key_prefix}")
        processor_type = pathlib.Path(bucket_key_prefix).suffix

    processor = factory.get_file_processor(processor_type)
    processor().process_file(bucket_name, bucket_key_prefix)
