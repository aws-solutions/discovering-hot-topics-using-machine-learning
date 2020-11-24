/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

const AWSMock = require('aws-sdk-mock');
const expect = require('chai').expect;
const RecordExtractor = require('../util/extract-records');

describe('Test Record Extractor', () => {
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
            callback(null, {
                Deleted: []
            });
        });
    });

    it ('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('testBucket')).to.equal('Success');
    });

    it ('transfers objects across buckets', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.transferRecords('2020/06/26/17/WfEngineRawForTAKinesisFire-3T9AxHZH197U-1-2020-06-26-17-04-05-471e7368-83ef-4210-839b-137e9427018c', 'destinationBucket')).to.equal('Success');
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});

describe ('Some error scenarios', () => {
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
            callback(null, {
                Deleted: [{
                    key: '2020/06/26/17/WfEngineRawForTAKinesisFire-3T9AxHZH197U-1-2020-06-26-17-04-05-471e7368-83ef-4210-839b-137e9427018c'
                }]
            });
        });
    });

    it ('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('testBucket')).to.equal('Success');
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});

describe('When Content length is 0 bucket is empty', () => {
    beforeEach(() => {
        AWSMock.mock('S3', 'copyObject', (error, callback) => {
            callback(null, 'Success');
        });

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [],
                IsTruncated: false,
                KeyCount: 2,
                MaxKeys: 2,
                Name: "examplebucket",
                NextContinuationToken: "1w41l63U0xa8q7smH50vCxyTQqdxo69O3EmK28Bi5PcROI4wI/EyIJg==",
                Prefix: ""
            });
        });

        AWSMock.mock('S3', 'deleteObjects', (error, callback) => {
            callback(null, {
                Deleted: []
            });
        });
    });

    it ('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('testBucket')).to.equal('Success');
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});