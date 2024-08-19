#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os
import unittest

from util import config_helper


class TestConfigHelper(unittest.TestCase):
    def test_validate_2_char_iso_code(self):
        self.assertEqual(config_helper.validate_2_char_iso_code("US"), "US")
        self.assertEqual(config_helper.validate_2_char_iso_code("en"), "en")
        self.assertEqual(config_helper.validate_2_char_iso_code("jp"), "jp")

    def test_validate_2_char_iso_code_throw_error(self):
        with self.assertRaises(TypeError):
            config_helper.validate_2_char_iso_code("ABC")
            config_helper.validate_2_char_iso_code("e")

    def test_validate_topic(self):
        self.assertEqual(config_helper.validate_topic("tech"), "tech")
        self.assertEqual(config_helper.validate_topic("entertainment"), "entertainment")
        self.assertEqual(config_helper.validate_topic("Entertainment"), "entertainment")
        self.assertEqual(config_helper.validate_topic("NEWS"), "news")

    def test_validate_topic_with_invalid_topic(self):
        with self.assertRaises(TypeError):
            config_helper.validate_topic("faketopic")

    def test_retrieve_urls_with_json_str(self):
        param_str = '{"country":"CA", "language":"fr"}'
        self.assertListEqual(config_helper.retrieve_urls_using_json(param_str), ["lapresse.ca"])
        self.assertEqual(len(config_helper.retrieve_urls_using_json(param_str)), 1)

    def test_retrieve_urls_with_no_urls(self):
        param_str = '{"country":"US", "language":"es"}'
        self.assertIsNone(config_helper.retrieve_urls_using_json(param_str))

    def test_retrieve_urls_with_topic(self):
        param_str = '{"country":"US", "language":"en", "topic": "entertainment"}'
        self.assertListEqual(config_helper.retrieve_urls_using_json(param_str), ["ew.com"])

    def test_retrieve_urls_to_log_exception_and_return_none(self):
        param_str = '{"country":"ABC", "language":"en", "topic": "entertainment"}'
        with self.assertRaises(TypeError):
            config_helper.retrieve_urls_using_json(param_str)

    def test_provide_incorrect_iso_code(self):
        param_str_incorrect_country = '{"country":"AB", "language":"en", "topic": "entertainment"}'
        self.assertEqual(len(config_helper.retrieve_urls_using_json(param_str_incorrect_country)), 0)

        param_str_incorrect_language = '{"country":"AB", "language":"jk", "topic": "entertainment"}'
        self.assertEqual(len(config_helper.retrieve_urls_using_json(param_str_incorrect_language)), 0)

        param_str_incorrect_country_and_language = '{"country":"AB", "language":"jk", "topic": "entertainment"}'
        self.assertEqual(len(config_helper.retrieve_urls_using_json(param_str_incorrect_country_and_language)), 0)

    def test_retrieve_urls(self):
        self.assertEqual(len(config_helper.retrieve_urls(country="US", language="en")), 45)
        self.assertEqual(len(config_helper.retrieve_urls(country="US", topic="tech")), 9)
        self.assertEqual(len(config_helper.retrieve_urls(topic="entertainment")), 41)
        self.assertEqual(len(config_helper.retrieve_urls(language="fr")), 140)
        self.assertIsNone(config_helper.retrieve_urls(country="AB", language="en"))
        self.assertIsNone(config_helper.retrieve_urls(language="ab"))

    def test_for_type_error_retrieve_urls(self):
        with self.assertRaises(TypeError):
            config_helper.retrieve_urls(country="ZYX", topic="tech")
