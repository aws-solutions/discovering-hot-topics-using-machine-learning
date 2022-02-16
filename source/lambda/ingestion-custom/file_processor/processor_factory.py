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

from shared_util.custom_logging import get_logger

from file_processor.file_processor import FileProcessorBuilder

logger = get_logger(__name__)


class FileProcessorFactory:
    """
    Factory class to register FileProcessors for different file types/ file extensions
    """

    def __init__(self):
        self._processor_builders = {}

    def register_processor_for_file_format(self, processor_type: str, processor_builder: FileProcessorBuilder):
        self._processor_builders[processor_type] = processor_builder

    def get_file_processor(self, processor_type: str):
        builder = self._processor_builders.get(processor_type)
        if not builder:
            logger.error(f"No processor found for {processor_type}")
            raise ValueError(f"No processor found for {processor_type}")
        return builder()
