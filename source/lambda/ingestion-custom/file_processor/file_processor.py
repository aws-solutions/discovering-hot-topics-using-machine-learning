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
from abc import ABC, abstractmethod

from shared_util.custom_logging import get_logger
from util.constants import ID, CREATED_DATE, TEXT, LANG, ACCOUNT_NAME, PLATFORM

logger = get_logger(__name__)


class IncorrectEnvSetup(Exception):
    pass


class FileProcessor(ABC):
    """
    This class is the parent class for all file types to be processed. Any implementation of
    a specific file type should extend the @FileProcessor class
    """

    def __init__(
        self,
        id_key,
        created_date_key,
        text_key,
        lang_key,
        account_name_value,
        platform_value,
    ):

        self.id_key = id_key
        self.created_date_key = created_date_key
        self.text_key = text_key
        self.lang_key = lang_key
        self.account_name_value = account_name_value
        self.platform_value = platform_value

    @abstractmethod
    def process_file(self, bucket_name: str, key_prefix: str):
        pass


class FileProcessorBuilder(ABC):
    """
    This class is the parent builder class that creates a processor. All file processors should have a builder that extends from either
    this class or its inherited classes. The builder validates if the the processor pre-requisites are satisfied before creating
    its instance.
    """

    def __init__(self):
        self._process_instance = None

    def _is_env_setup(self):
        """
        Check if key attributes; id, created_at, text, lang, account_name, platform are set
        """
        if (
            os.environ.get(ID)
            and os.environ.get(CREATED_DATE)
            and os.environ.get(TEXT)
            and os.environ.get(LANG)
            and os.environ.get(ACCOUNT_NAME)
            and os.environ.get(PLATFORM)
        ):
            return
        else:
            error_str = "Incorrect environment setup. Could not find key attributes ID, CREATED_AT, TEXT, LANG, ACCOUNT_NAME, and LANG in environment configuration"
            logger.error(error_str)
            raise IncorrectEnvSetup(error_str)
