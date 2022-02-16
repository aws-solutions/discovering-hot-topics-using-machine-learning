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

import botocore
from datetime import datetime, timezone
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_resource, get_service_client
from util.constants import TIMESTAMP_FORMAT

logger = get_logger(__name__)

local_folder_path = tempfile.gettempdir()

max_file_size = 10000000  # this number is in bytes that equals 10 MB


class FileSizeTooBigException(Exception):
    pass


def download_file(bucket_name: str, key_prefix: str):
    s3 = get_service_resource("s3")
    """ Download the file locally to the /tmp folder provided by lambda runtime """
    logger.debug(f"prefix is {key_prefix}")
    local_file_name = os.path.basename(key_prefix)  # get file name
    local_file_path = os.path.join(local_folder_path, local_file_name)  # generate destination file path
    bucket = s3.Bucket(bucket_name)

    # check file size
    size = bucket.Object(key_prefix).content_length
    if size > max_file_size:
        err_msg = f"File {key_prefix} in bucket {bucket_name} too big to process. Max file size allowed is 10 MB"
        logger.error(err_msg)
        raise FileSizeTooBigException(err_msg)

    try:
        bucket.download_file(key_prefix, local_file_path)
    except botocore.exceptions.ClientError as e:
        logger.error(
            f"When downloading file from bucket: {bucket_name} and prefix: {key_prefix} following error occured: {e}"
        )
        if e.response["Error"]["Code"]:
            logger.error(f"The service returned following error code: {e.response['Error']['Code']}")
        raise e
    return local_file_path


def tag_file_as_processed(bucket_name: str, key_prefix: str):
    """
    This method appends processed status tags. This utility method can be called once the files are processed by
    the respective processors
    """
    s3 = get_service_client("s3")
    # get existing tags
    tags = s3.get_object_tagging(Bucket=bucket_name, Key=key_prefix)["TagSet"]
    logger.debug(f"Old tags retrieved are: {tags}")

    # merge old tags and new tags
    tags.extend(
        [
            {"Key": "processed_on", "Value": datetime.now(timezone.utc).strftime(TIMESTAMP_FORMAT)},
            {"Key": "processing_status", "Value": "COMPLETE"},
        ]
    )

    s3.put_object_tagging(
        Bucket=bucket_name,
        Key=key_prefix,
        Tagging={"TagSet": tags},
    )
