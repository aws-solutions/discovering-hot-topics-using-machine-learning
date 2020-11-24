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
const axios = require('axios');
const stream = require('stream');
const fs = require('fs');
const AWS = require('aws-sdk');

const AWSMock = require('aws-sdk-mock');
const sinon = require('sinon');
const assert = require('assert');

const ImageExtractor = require('../util/extract-image');

describe('Test retrieveIamageAndS3Upload', () => {
    beforeEach(() => {
        AWSMock.mock('S3', 'upload', (error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    return resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
        });
    });

    it ('should execute succesfully', async(done) => {
        const spy = sinon.spy(ImageExtractor, 'retrieveImageAndS3Upload');
        await ImageExtractor.retrieveImageAndS3Upload('https://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg', 'TestBucket', 'RandomKey');
        assert(spy.calledOnce);
        done();
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});

describe('Test S3 Upload', () => {
    beforeEach(() => {
        AWSMock.mock('S3', 'upload', (error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    return resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
        });
    });

    it ('should successfully mock S3 upload', async (done) => {
        const s3 = new AWS.S3();
        await s3.upload({
            Bucket: 'TestBucket',
            Key: 'RandomKey',
            Body: fs.createReadStream(`${__dirname}/text.png`)
        }).promise().then((result) => {
            done();
        });
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});

describe('Test Error scenario', () => {
    beforeEach(() => {
        AWSMock.mock('S3', 'upload', (error, callback) => {
            callback(new Error('S3 upload failed'), null);
        });
    });

    it ('should fail S3 upload', async () => {
        const s3 = new AWS.S3();
        await s3.upload({
                Bucket: 'TestBucket',
                Key: 'RandomKey',
                Body: fs.createReadStream(`${__dirname}/text.png`)
        }).promise().catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail()
            }
            assert.equal(error.message, 'S3 upload failed');
        });
    });

    afterEach(() => {
        AWSMock.restore('S3');
    });
});

describe('Test mock axios with S3 upload mock', () => {
    beforeEach(() => {
        AWSMock.mock('S3', 'upload', (error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    return resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
        });
    });

    afterEach(() => {
        AWSMock.restore('S3');

    });

    it ('return a readstream and successfully uploads', async (done) => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return { status: 200, data: fs.createReadStream(`${__dirname}/text.png`) };
        });

        const response = await axios.default.get('http://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg', { responseType: 'stream' });
        const passThrough = new stream.PassThrough();
        response.data.pipe(passThrough);

        const s3 = new AWS.S3();

        await s3.upload({
            Bucket: 'TestBucket',
            Key: 'RandomKey',
            Body: passThrough
        }).promise().then((result) => {
            done();
        });

        axiosStub.restore();
    });
});