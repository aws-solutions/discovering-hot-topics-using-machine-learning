#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

from test.test_s3_util import MOCK_BUCKET, MOCK_XLSX_FILE_PREFIX

xls_file_upload_event = {
    "version": "0",
    "id": "fakeId",
    "detail-type": "Object Created",
    "source": "aws.s3",
    "account": "fakeAccount",
    "time": "2021-11-12T00:00:00Z",
    "region": "us-east-1",
    "resources": ["arn:aws:s3:::mock_bucket"],
    "detail": {
        "version": "0",
        "bucket": {"name": "mock_bucket"},
        "object": {
            "key": "mock_data_file.xlsx",
            "size": 5,
            "etag": "faketag",
            "version-id": "fakeversionId",
            "sequencer": "fakesequencer",
        },
        "request-id": "fakerequestId",
        "requester": "fakerequester",
        "source-ip-address": "fakeip",
        "reason": "PutObject",
    },
}
