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

describe('Execute lambda function', () => {

    beforeEach(() => {
        AWSMock.mock('S3', 'copyObject', (error, callback) => {
            callback(null, 'Success');
        });

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [{
                    ETag: "\"70ee1738b6b21e2c8a43f3a5ab0eee71\"",
                    Key: "2020/06/26/17/WfEngineRawForTAKinesisFire-3T9AxHZH197U-1-2020-06-26-17-10-06-933bebb3-9b5b-437d-8215-f288de7784d4",
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: "STANDARD"
                }, {
                    ETag: "\"becf17f89c30367a9a44495d62ed521a-1\"",
                    Key: "2020/06/26/17/WfEngineRawForTAKinesisFire-3T9AxHZH197U-1-2020-06-26-17-04-05-471e7368-83ef-4210-839b-137e9427018c",
                    LastModified: new Date(),
                    Size: 4192256,
                    StorageClass: "STANDARD"
                }],
                IsTruncated: false,
                KeyCount: 2,
                MaxKeys: 2,
                Name: "examplebucket",
                NextContinuationToken: "1w41l63U0xa8q7smH50vCxyTQqdxo69O3EmK28Bi5PcROI4wI/EyIJg==",
                Prefix: ""
            });
        });

        AWSMock.mock('S3', 'deleteObjects', (error, callback) => {
            callback(null,  {
                Deleted: []
            });
        });

        AWSMock.mock('Comprehend', 'startTopicsDetectionJob', (error, callback) => {
            callback(null, {
                "JobId": "12345678901233456789",
                "JobName": "topic_modeling",
                "JobStatus": "SUBMITTED",
                "SubmitTime": "2020-06-26T19:05:16.785Z",
                "EndTime": "2020-06-26T19:31:13.798Z",
                "InputDataConfig": {
                    "S3Uri": "s3://testIngestionBucket",
                    "InputFormat": "ONE_DOC_PER_LINE"
                },
                "OutputDataConfig": {
                    "S3Uri": "s3://inferenceBucket"
                },
                "NumberOfTopics": 25,
                "DataAccessRoleArn": "arn:aws:iam::testaccount:role/service-role/AmazonComprehendServiceRole-ForTest"
            });
        });

        process.env.INGESTION_S3_BUCKET_NAME = 'testIngestionBucket';
        process.env.RAW_BUCKET_FEED = 'rawBucketFeed';
        process.env.INGESTION_WINDOW = '2';
        process.env.DATA_ACCESS_ARN = 'arn:aws:iam::testaccount:role/service-role/AmazonComprehendServiceRole-ForTest'
        process.env.INFERENCE_BUCKET = 'inferenceBucket';
        process.env.NUMBER_OF_TOPICS = '10'
    });

    it ('should execute the lambda function', async () => {
        const event = {};
        const response = await lambda.handler(event);
        expect(response.JobId).to.equal('12345678901233456789');
        expect(response.JobStatus).to.equal('SUBMITTED');
    });

    afterEach(() => {
        AWSMock.restore('S3');

        delete process.env.INGESTION_S3_BUCKET_NAME;
        delete process.env.RAW_BUCKET_FEED;
        delete process.env.INGESTION_WINDOW;
        delete process.env.DATA_ACCESS_ARN;
        delete process.env.INFERENCE_BUCKET;
        delete process.env.NUMBER_OF_TOPICS;
    });
});