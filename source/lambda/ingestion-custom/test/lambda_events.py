#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
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
