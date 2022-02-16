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

import jmespath
import json
import os
import uuid
from abc import ABC
from datetime import datetime, timezone

from shared_util.custom_logging import get_logger
from shared_util.stream_helper import buffer_data_into_stream
from util import helpers, s3_util

from file_processor.file_processor import FileProcessor, FileProcessorBuilder
from util.constants import (
    ACCOUNT_NAME,
    CREATED_DATE,
    ID,
    LANG,
    PLATFORM,
    TEXT,
    LIST_SELECTOR,
    GENERATE,
    NOW,
    TIMESTAMP_FORMAT,
)

logger = get_logger(__name__)


class JSONFileProcessor(FileProcessor):
    def __init__(
        self, id_key, created_date_key, text_key, lang_key, account_name_value, platform_value, list_selector=None
    ):
        super().__init__(
            id_key,
            created_date_key,
            text_key,
            lang_key,
            account_name_value,
            platform_value,
        )

        # build compiled expressions for jmespath
        self.list_selector_expression = None
        if list_selector:
            self.list_selector_key = list_selector
            self.list_selector_expression = jmespath.compile(self.list_selector_key)

        # Do not create an expression if id_key is set to 'GENERATE'. The id_str value has to be generated
        # This function will use uuid.uuid4 to generate a random parent_id and append the  index of the record
        # from the array to generate a unique id.
        if self.id_key and self.id_key != GENERATE:
            self.id_expression = jmespath.compile(self.id_key)
        else:
            self.id_expression = None

        # Do not create an expression if created_date is set as 'NOW'. This is when the dataset does not
        # have a date value and uses system date to process the information
        if self.created_date_key != NOW:
            self.create_date_expression = jmespath.compile(self.created_date_key)
        else:
            self.create_date_expression = None

        self.text_expression = jmespath.compile(self.text_key)
        self.lang_expression = jmespath.compile(self.lang_key)

    def process_file(self, bucket_name: str, key_prefix: str):
        # download the file and build the array of json documents
        file_path = s3_util.download_file(bucket_name, key_prefix)
        with open(file_path) as json_file:
            # generating a parent_id as a mechanism to aggregate records from the same file. An index will
            # be appended to this parent_id for each individual record using '#' delimiter
            parent_id = None
            if not self.id_expression:
                parent_id = uuid.uuid4().hex

            source_json_data = json.load(json_file)

            lang_code = None
            if self.lang_expression.search(source_json_data):
                lang_code = self.lang_expression.search(source_json_data)

            created_at = None
            if not self.create_date_expression:
                created_at = datetime.now(timezone.utc).strftime(TIMESTAMP_FORMAT)

            if self.list_selector_expression:
                json_data = self.list_selector_expression.search(source_json_data)
                for index, record in enumerate(json_data):
                    output_record = self.transform_row(
                        record, index, lang=lang_code, parent_id=parent_id, created_at=created_at
                    )
                    output_record["feed"]["source_file"] = os.path.basename(file_path)
                    logger.debug(f"JSON record is: {json.dumps(output_record)}")
                    # buffer the output_record into kinesis data stream
                    buffer_data_into_stream(output_record, partition_key=output_record["feed"]["id_str"])

                # since the selector section of the json is already processed above, removing that key from the
                # json object to reduce the parameter size
                del source_json_data[self.list_selector_key]
                self.auxillary_processing_callback(source_json_data, parent_id=parent_id, created_at=created_at)
            else:
                output_record = self.transform_row(
                    source_json_data, 0
                )  # passing index as 0 since it has only 1 record in a file
                logger.debug(f"JSON record is: {json.dumps(output_record)}")
                buffer_data_into_stream(output_record, partition_key=output_record["feed"]["id_str"])
        # now since the file is processed, delete the file. This would ensure if the same lambda instance is used,
        # it would not have the same file in the /tmp directory
        os.remove(file_path)
        s3_util.tag_file_as_processed(bucket_name, key_prefix)  # tag file in s3 that processing is complete

    def auxillary_processing_callback(self, json_data, **kwargs):
        """
        This method is not required to be implemented for a basic JSON processing. This `process_file` method
        in this class processes the standard elements like id, text content, date, language. This method
        callback method provides a mechanism to process additional attributes or metadata. This parent class
        will have an empty implementation for this method. Child classes optionally can implement this
        method
        """
        pass

    def transform_row(self, record, index, lang=None, parent_id=None, created_at=None):
        feed = {}
        if parent_id:
            # Generate the unique identifier since it is not available in the data records
            feed["id_str"] = f"{parent_id}#{index}"
            feed["parent_id"] = f"{parent_id}"
        else:
            feed["id_str"] = self.id_expression.search(record)

        # If the created_date is not available in the source file, then the jmespath compile expression
        # is set to None, hence the processing should use the system date.
        if self.create_date_expression:
            feed["created_at"] = self.create_date_expression.search(record)
        else:
            feed["created_at"] = created_at

        feed["text"] = helpers.strip_html(self.text_expression.search(record))

        # For multiple records language may be externalized. If language is not found outside the list, in
        # which case it will be passed as a parameter. Parameter for lang codes takes higher precedence
        # and hence any lang value within the record will be ignored.
        if lang:
            feed["lang"] = lang[:2]
        else:
            feed["lang"] = self.lang_expression.search(record)

        output_record = {
            "account_name": self.account_name_value,
            "platform": self.platform_value,
            "search_query": "",
            "feed": feed,
        }

        # merge the record (the original json that was passed) in to output_record
        output_record["feed"].update(record)
        return output_record


class JSONFileProcessorBuilder(FileProcessorBuilder):
    def __call__(self):
        if not self._process_instance:
            super()._is_env_setup()
            """Retrieve key mappings and initialize the settings for processing"""
            self._process_instance = JSONFileProcessor(
                os.environ[ID],
                os.environ[CREATED_DATE],
                os.environ[TEXT],
                os.environ[LANG],
                os.environ[ACCOUNT_NAME],
                os.environ[PLATFORM],
                list_selector=os.environ.get(LIST_SELECTOR, None),
            )
        return self._process_instance
