/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                      *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

exports.event = {
    "version": "0",
    "id": "fakeId",
    "detail-type": "Scheduled Event",
    "source": "aws.events",
    "account": "fakeaccountId",
    "time": "faketimestamp",
    "region": "us-east-1",
    "resources": [
        "arn:aws:events:us-east-1:fakeaccountId:rule/fake-scheduled-rule"
    ],
    "detail": {}
}

exports.cfn_event = {
    "RequestType" : "Create",
    "ResponseURL" : "https://pre-signed-S3-url-for-response",
    "StackId" : "arn:aws:cloudformation:us-east-1:fakeaccountId:stack/stack-name/guid",
    "RequestId" : "unique id for this create request",
    "ResourceType" : "Custom::CreateParition",
    "LogicalResourceId" : "CreateParition",
    "ResourceType": "Custom::CreatePartition",
    "ServiceToken": "arn:aws:lambda:us-east-1:fakeAccountId:function:fakeFunctionName"
}

let end;

exports.context = {
    "callbackWaitsForEmptyEventLoop": true,
    "functionVersion": "$LATEST",
    "functionName": "fakeFunctionName",
    "memoryLimitInMB": "128",
    "logGroupName": "/aws/lambda/fakeLogGroupName",
    "logStreamName": "2020/09/19/[$LATEST]fakeLogStreamName",
    "invokedFunctionArn": "arn:aws:lambda:us-east-1:fakeAccountId:function:fakeFunctionName",
    "awsRequestId": "fakeRequestId",
    succeed: result => {
        end = Date.now();
    },
    fail: err => {
        end = Date.now();

        if (typeof err === 'string') {
            err = new Error(err);
        }
    },
    done: (err, result) => {
        if (err) {
            this.context.fail(err);
            return;
        }
        this.context.succeed(result);
    },
}