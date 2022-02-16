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
import tempfile
import unittest
import pytest
import boto3
import botocore
from moto import mock_s3
from shared_util import custom_boto_config
from shared_util.service_helper import get_service_resource
from util.s3_util import download_file, tag_file_as_processed, FileSizeTooBigException


MOCK_BUCKET = "mock_bucket"
MOCK_XLSX_FILE_PREFIX = "mock_data_file.xlsx"
MOCK_MULTI_JSON_FILE_PREFIX = "mock_multiple_data_file.json"
MOCK_JSON_FILE_PREFIX = "mock_single_data_file.json"
MOCK_CALL_ANALYTICS_FILE_PREFIX = "mock_call_analytics_job.json"


included_extensions = ["xls", "xlsx", "csv", "json"]


@mock_s3()
def s3_setup():
    conn = boto3.resource("s3", config=custom_boto_config.init())
    conn.create_bucket(Bucket=MOCK_BUCKET)
    fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")
    _upload_fixtures(MOCK_BUCKET, fixtures_dir)


def _upload_fixtures(bucket: str, fixtures_dir: str) -> None:
    client = boto3.client("s3", config=custom_boto_config.init())
    filenames = [fn for fn in os.listdir(fixtures_dir) if any(fn.endswith(ext) for ext in included_extensions)]
    for filename in filenames:
        client.upload_file(Filename=f"{fixtures_dir}/{filename}", Bucket=bucket, Key=filename)


def s3_tear_down():
    s3 = boto3.resource("s3", config=custom_boto_config.init())
    bucket = s3.Bucket(MOCK_BUCKET)
    for key in bucket.objects.all():
        key.delete()
    bucket.delete()


def get_mock_client_exception():
    return botocore.errorfactory.ClientError(
        error_response={"Error": {"Code": "404", "Message": "Fake error"}}, operation_name="download_file"
    )


@mock_s3()
class TestS3Util(unittest.TestCase):
    def setUp(self):
        s3_setup()

    def test_download_files(self):
        fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")
        filenames = [fn for fn in os.listdir(fixtures_dir) if any(fn.endswith(ext) for ext in included_extensions)]
        for filename in filenames:
            local_file_path = download_file(MOCK_BUCKET, filename)
            self.assertEqual(os.path.basename(local_file_path), os.path.basename(filename))

    def test_error_for_download_files(self):
        with pytest.raises(botocore.errorfactory.ClientError):
            with unittest.mock.patch(
                "boto3.s3.transfer.S3Transfer.download_file", side_effect=get_mock_client_exception()
            ):
                download_file(MOCK_BUCKET, "error_prefix")

    def test_error_for_file_too_big(self):
        client = boto3.client("s3", config=custom_boto_config.init())
        big_file = "mock_file_too_big.donotload"
        fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")
        client.upload_file(Filename=f"{fixtures_dir}/{big_file}", Bucket=MOCK_BUCKET, Key=big_file)
        with pytest.raises(FileSizeTooBigException):
            download_file(MOCK_BUCKET, big_file)

    def test_append_processed_tag(self):
        file_to_tag = MOCK_JSON_FILE_PREFIX
        tag_file_as_processed(MOCK_BUCKET, file_to_tag)

    def tearDown(self):
        s3_tear_down()
