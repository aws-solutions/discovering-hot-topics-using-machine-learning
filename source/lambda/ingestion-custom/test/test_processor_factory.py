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

from unittest import TestCase

from file_processor.processor_factory import FileProcessorFactory
from file_processor.xls_extn import ExcelFileProcessorBuilder
from file_processor.json_extn import JSONFileProcessorBuilder
from file_processor.file_processor import FileProcessorBuilder


class TestFileProcessorFactor(TestCase):
    def setUp(self):
        self._factory = FileProcessorFactory()

    def tearDown(self):
        pass

    def test_register_processor(self):
        self.assertDictEqual(self._factory._processor_builders, {})  # empty factory dict

        # register the first processor and the size of dict becomes 1
        self._factory.register_processor_for_file_format("xls", ExcelFileProcessorBuilder)
        self.assertEqual(len(self._factory._processor_builders.keys()), 1)

        # register the second processor and the size of the dict becomes 2
        self._factory.register_processor_for_file_format("json", JSONFileProcessorBuilder)
        self.assertEqual(len(self._factory._processor_builders.keys()), 2)

        # register the same processor with the same key, size does not change
        self._factory.register_processor_for_file_format("xls", ExcelFileProcessorBuilder)
        self.assertEqual(len(self._factory._processor_builders.keys()), 2)

    def test_get_processor(self):
        """
        Retrieved registered FileProcessors as well as enforcing that all builders registered should
        inherit from FileProcessorBuilder class
        """
        self._factory.register_processor_for_file_format("xls", ExcelFileProcessorBuilder)
        self._factory.register_processor_for_file_format("json", JSONFileProcessorBuilder)

        self.assertIsInstance(self._factory.get_file_processor("xls"), FileProcessorBuilder)
        self.assertIsInstance(self._factory.get_file_processor("xls"), ExcelFileProcessorBuilder)

        self.assertIsInstance(self._factory.get_file_processor("json"), FileProcessorBuilder)
        self.assertIsInstance(self._factory.get_file_processor("json"), JSONFileProcessorBuilder)

    def test_no_processor_found(self):
        """
        Test the condition when no processor is registered with the factory
        """
        with self.assertRaises(ValueError) as error:
            self._factory.get_file_processor("empty")
            self.assertEqual(error.msg, "No processor found for empty")
