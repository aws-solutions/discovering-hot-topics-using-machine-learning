/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

const AWSMock = require('aws-sdk-client-mock');
const { S3Client, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3Mock = AWSMock.mockClient(S3Client);
const expect = require('chai').expect;
const RecordExtractor = require('../util/extract-image');

describe('Test Record Extractor', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        s3Mock.on(ListObjectsV2Command).resolves({
            Contents: [
                {
                    ETag: '"70ee1738b6b21e2c8a43f3a5ab0eee71"',
                    Key: '12345678901234567890/image1.png',
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: 'STANDARD'
                },
                {
                    ETag: '"becf17f89c30367a9a44495d62ed521a-1"',
                    Key: '12345678901234567890/image2.jpg',
                    LastModified: new Date(),
                    Size: 4192256,
                    StorageClass: 'STANDARD'
                }
            ],
            IsTruncated: false,
            KeyCount: 2,
            MaxKeys: 2,
            Name: 'examplebucket',
            NextContinuationToken: '1w41l63U0xa8q7smH50vCxyTQqdxo69O3EmK28Bi5PcROI4wI/EyIJg==',
            Prefix: ''
        });

        s3Mock.on(DeleteObjectsCommand).resolves({
            Deleted: []
        });
    });

    it('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('examplebucket', '12345678901234567890')).to.equal('Success');
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
    });
});

describe('Test Record Extractor', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        s3Mock.on(ListObjectsV2Command).resolves({
            Contents: [],
            IsTruncated: false,
            KeyCount: 0,
            MaxKeys: 2,
            Name: 'examplebucket',
            Prefix: ''
        });

        s3Mock.on(DeleteObjectsCommand).resolves({
            Deleted: []
        });
    });

    it('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('examplebucket', '12345678901234567890')).to.equal('Success');
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
    });
});

describe('Test Record Extractor', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        s3Mock.on(ListObjectsV2Command).resolves({
            Contents: [
                {
                    ETag: '"70ee1738b6b21e2c8a43f3a5ab0eee71"',
                    Key: '12345678901234567890/image1.png',
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: 'STANDARD'
                },
                {
                    ETag: '"becf17f89c30367a9a44495d62ed521a-1"',
                    Key: '12345678901234567890/image2.jpg',
                    LastModified: new Date(),
                    Size: 4192256,
                    StorageClass: 'STANDARD'
                }
            ],
            IsTruncated: false,
            KeyCount: 2,
            MaxKeys: 2,
            Name: 'examplebucket',
            NextContinuationToken: '1w41l63U0xa8q7smH50vCxyTQqdxo69O3EmK28Bi5PcROI4wI/EyIJg==',
            Prefix: ''
        });

        s3Mock.on(DeleteObjectsCommand).resolves({
            Deleted: [
                {
                    key: '12345678901234567890/image2.jpg'
                }
            ]
        });
    });

    it('empties objects from the S3 bucket', async () => {
        const recordExtractor = new RecordExtractor();
        expect(await recordExtractor.emptyBucket('examplebucket', '12345678901234567890')).to.equal('Success');
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
    });
});
