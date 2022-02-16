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

from shared_util.custom_logging import get_logger
from file_processor.file_processor import ACCOUNT_NAME, CREATED_DATE, ID, LANG, PLATFORM, TEXT, IncorrectEnvSetup
from file_processor.json_extn import JSONFileProcessor, JSONFileProcessorBuilder, LIST_SELECTOR
from util.constants import SENTIMENT
from util.event_bridge_util import send_event

logger = get_logger(__name__)


class TranscribeCallAnalyticsProcessor(JSONFileProcessor):
    def __init__(
        self,
        id_key,
        created_date_key,
        text_key,
        lang_key,
        account_name_value,
        platform_value,
        sentiment_value,
        list_selector,
    ):
        super().__init__(
            id_key,
            created_date_key,
            text_key,
            lang_key,
            account_name_value,
            platform_value,
            list_selector=list_selector,
        )
        self.sentiment_expression = jmespath.compile(sentiment_value)

    def transform_row(self, record, index, lang=None, parent_id=None, created_at=None):
        output_record = super(TranscribeCallAnalyticsProcessor, self).transform_row(
            record, index, lang=lang, parent_id=parent_id, created_at=created_at
        )
        output_record["Sentiment"] = self.sentiment_expression.search(record)
        return output_record

    def auxillary_processing_callback(self, json_data, **kwargs):
        """Here is where metadata from the trascribe call analytics output is processed"""
        parent_id = kwargs.get("parent_id", None)
        created_at = kwargs.get("created_at", None)
        if parent_id and created_at:
            output_record = {}
            output_record["platform"] = f"{self.platform_value}metadata"
            output_record["account_name"] = self.account_name_value
            json_data["created_at"] = created_at
            json_data["parent_id"] = parent_id
            output_record["feed"] = json_data
            detail_type = "TRANSCRIBE_METADATA"
            source = os.environ["NAMESPACE"]
            send_event(json.dumps(output_record), detail_type, source)
        else:
            err_msg = "Unique ID not available to create data lineage"
            logger.error(err_msg)
            raise ValueError(err_msg)


class TranscribeCallAnalyticsBuilder(JSONFileProcessorBuilder):
    def __call__(self):
        if not self._process_instance:
            self._is_env_setup()
            """Retrieve key mappings and initialize the settings for processing"""
            self._process_instance = TranscribeCallAnalyticsProcessor(
                os.environ[ID],
                os.environ[CREATED_DATE],
                os.environ[TEXT],
                os.environ[LANG],
                os.environ[ACCOUNT_NAME],
                os.environ[PLATFORM],
                os.environ[SENTIMENT],
                os.environ[LIST_SELECTOR],
            )
        return self._process_instance

    def _is_env_setup(self):
        super()._is_env_setup()
        if os.environ.get(SENTIMENT) and os.environ.get(LIST_SELECTOR):
            return
        else:
            error_str = "Incorrect environment setup. Could not find key attributes SENTIMENT and LIST_SELECTOR in environment configuration"
            logger.error(error_str)
            raise IncorrectEnvSetup(error_str)
