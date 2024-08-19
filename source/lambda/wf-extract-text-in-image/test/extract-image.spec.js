/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';
const axios = require('axios');
const stream = require('stream');
const fs = require('fs');
const { Upload } = require('@aws-sdk/lib-storage');
const AWSMock = require('aws-sdk-client-mock');
const { S3Client, UploadPartCommand } = require('@aws-sdk/client-s3');
const s3Mock = AWSMock.mockClient(S3Client);
const sinon = require('sinon');
const assert = require('assert');

const ImageExtractor = require('../util/extract-image');

describe('Test retrieveIamageAndS3Upload', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        jest.spyOn(Upload.prototype, 'done')
            .mockImplementation(() => {
                return {
                    ETag: 'SomeETag',
                    Location: 'PublicWebsiteLink',
                    Key: 'RandomKey',
                    Bucket: 'TestBucket'
                };
            });
    });

    it('should execute succesfully', async () => {
        const spy = sinon.spy(ImageExtractor, 'retrieveImageAndS3Upload');
        await ImageExtractor.retrieveImageAndS3Upload(
            'https://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg',
            'TestBucket',
            'RandomKey'
        );
        assert(spy.calledOnce);
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
        jest.clearAllMocks();
    });
});

describe('Test S3 Upload', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        jest.spyOn(Upload.prototype, 'done')
            .mockImplementation(() => {
                return {
                    ETag: 'SomeETag',
                    Location: 'PublicWebsiteLink',
                    Key: 'RandomKey',
                    Bucket: 'TestBucket'
                };
            });
    });

    it('should successfully mock S3 upload', async () => {
        const s3 = new S3Client();
        await new Upload({
            client: s3,
            params: {
                Bucket: 'TestBucket',
                Key: 'RandomKey',
                Body: fs.createReadStream(`${__dirname}/text.png`)
            }
        }).done();
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
        jest.clearAllMocks();
    });
});

describe('Test Error scenario', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
            callback(new Error('S3 upload failed'), null);
        });

        jest.spyOn(Upload.prototype, 'done')
            .mockImplementation(() => {
                throw new Error('S3 upload failed');
            });
    });

    it('should fail S3 upload', async () => {
        const s3 = new S3Client();

        await ImageExtractor.retrieveImageAndS3Upload(
            'https://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg',
            'TestBucket',
            'RandomKey'
        ).catch((error) => {
            console.log("here1");
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'S3 upload failed');
        });
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
    });
});

describe('Test mock axios with S3 upload mock', () => {
    beforeEach(() => {
        s3Mock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        jest.spyOn(Upload.prototype, 'done')
            .mockImplementation(() => {
                return {
                    ETag: 'SomeETag',
                    Location: 'PublicWebsiteLink',
                    Key: 'RandomKey',
                    Bucket: 'TestBucket'
                };
            });
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        s3Mock.restore();
        jest.clearAllMocks();
    });

    it('return a readstream and successfully uploads', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return { status: 200, data: fs.createReadStream(`${__dirname}/text.png`) };
        });

        const response = await axios.default.get('http://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg', {
            responseType: 'stream'
        });
        const passThrough = new stream.PassThrough();
        response.data.pipe(passThrough);

        const s3 = new S3Client();

        await new Upload({
            client: s3,

            params: {
                Bucket: 'TestBucket',
                Key: 'RandomKey',
                Body: passThrough
            }
        }).done();

        axiosStub.restore();
    });
});
