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

const lambda = require('../index.js');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-mock');

describe('it should execute the lambda function correctly', () => {
    beforeEach(() => {
        AWSMock.mock('Comprehend', 'describeTopicsDetectionJob', (error, callback) => {
            callback(null,     {
                "TopicsDetectionJobProperties": {
                    "JobId": "1234567890123456789012345",
                    "JobName": "topic_modeling_job",
                    "JobStatus": "IN_PROGRESS",
                    "SubmitTime": "2020-06-26T19:05:16.785Z",
                    "EndTime": "2020-06-26T19:31:13.798Z",
                    "InputDataConfig": {
                        "S3Uri": "s3://testbucket",
                        "InputFormat": "ONE_DOC_PER_LINE"
                    },
                    "OutputDataConfig": {
                        "S3Uri": "s3://inferencebucket/testaccount-TOPICS-some1233556sagsdfa/output/output.tar.gz"
                    },
                    "NumberOfTopics": 25,
                    "DataAccessRoleArn": "arn:aws:iam::testaccount:role/service-role/AmazonComprehendServiceRole"
                }
            });
        });
    });

    it ('should execute the lambda function and return job status', async () => {
        const response = await lambda.handler({
            "JobId": "1234567890123456789012345",
            "JobStatus": "IN_PROGRESS"
        });
        expect(response.TopicsDetectionJobProperties.JobId).to.equal('1234567890123456789012345');
        expect(response.TopicsDetectionJobProperties.JobStatus).to.equal('IN_PROGRESS');
    });
});
