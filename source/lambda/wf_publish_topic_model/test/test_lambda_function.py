#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import os

import boto3
from moto import mock_s3


@mock_s3
def test_lambda_function():
    event = {
        "twitter": {
            "JobId": "12345678901234567890",
            "JobName": "DiscoveringHotTopicsUsingMachineLearning-1595090521262",
            "JobStatus": "IN_PROGRESS",
            "SubmitTime": "2020-07-18T16:42:02.483Z",
            "InputDataConfig": {"S3Uri": "s3://ingestio-tqsdiegtrmkp", "InputFormat": "ONE_DOC_PER_LINE"},
            "OutputDataConfig": {"S3Uri": "s3://2305002e803b60a8443cb7dd30/output/output.tar.gz"},
            "NumberOfTopics": 10,
            "DataAccessRoleArn": "arn:aws:iam::someaccountid:role/testrolename",
        }
    }

    with mock_s3():
        s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION"))
        with open(os.path.join(os.path.dirname(__file__), "fixtures", "output.tar.gz"), "rb") as f:
            body = f.read()
        s3.create_bucket(Bucket="testbucket")
        s3.create_bucket(Bucket="inferencebucket")
        s3.put_object(
            Bucket="inferencebucket", Key="testaccount-TOPICS-some1233556sagsdfa/output/output.tar.gz", Body=body
        )
    from botocore.stub import Stubber
    from wf_publish_topic_model.lambda_function import handler

    event_bridge_client = boto3.client("events", os.environ["AWS_REGION"])
    stubber = Stubber(event_bridge_client)
    stubber.add_response("put_events", {"FailedEntryCount": 0, "Entries": [{"EventId": "12456663423"}]})
    stubber.activate()
    # TODO fix the test case. Stubber does not work currently
    # with stubber:
    #     handler(event, None)
