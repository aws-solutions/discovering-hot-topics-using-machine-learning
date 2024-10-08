/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const assert = require('assert');
const AWSMock = require('aws-sdk-client-mock');
const { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } = require('@aws-sdk/client-sfn');
const sfnMock = AWSMock.mockClient(SFNClient);
const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const rekognitionMock = AWSMock.mockClient(RekognitionClient);
const { S3Client, UploadPartCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const s3Mock = AWSMock.mockClient(S3Client);
const axios = require('axios');
const fs = require('fs');

const lambda = require('../index.js');
const __test__ = require('./event-feed-test-data');
const __rekresponse__ = require('./rek-response-test-data');

describe('Test the lambda function Rek found no text', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
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

        rekognitionMock.on(DetectTextCommand).resolves(__rekresponse__.rekResponse_with_empty_text_detections);

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities_for_no_text).then((result) => {
            expect(result[0].text_in_images).to.be.empty;
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        rekognitionMock.restore();
        sfnMock.restore();

        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
        jest.clearAllMocks();
    });
});

describe('Test the lambda function Rek found no text', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
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

        rekognitionMock.on(DetectTextCommand).resolves(__rekresponse__.rekResponse_with_undefined_text_detections);

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').resolves(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities_for_no_text).then((result) => {
            expect(result[0].text_in_images).to.be.empty;
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        sfnMock.restore();
        rekognitionMock.restore();
        jest.clearAllMocks();

        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Test the lambda function when Rek found text', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
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

        rekognitionMock.on(DetectTextCommand).resolves(__rekresponse__.rekResponse);

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities).then((result) => {
            expect(result[0].text_in_images[0].text).to.be.equal("IT'S MONDAY but keep Smiling");
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        rekognitionMock.restore();
        sfnMock.restore();
        jest.clearAllMocks();

        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Test the lambda function when Rek fails', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
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

        rekognitionMock.on(DetectTextCommand).callsFake((error, callback) => {
            callback(new Error('Rek service failed'), null);
        });

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Rek service failed');
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        rekognitionMock.restore();
        sfnMock.restore();
        jest.clearAllMocks();
        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Test the lambda function when S3 upload fails', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
            callback(new Error('S3 upload failed'), null);
        });

        jest.spyOn(Upload.prototype, 'done')
            .mockImplementation(() => {
                throw new Error('S3 upload failed');
            });

        rekognitionMock.on(DetectTextCommand).resolves(__rekresponse__.rekResponse);

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'S3 upload failed');
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        rekognitionMock.restore();
        sfnMock.restore();
        jest.clearAllMocks();

        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Test the lambda function when S3 upload fails', () => {
    beforeEach(() => {
        sfnMock.reset();
        rekognitionMock.reset();
        s3Mock.reset();
        process.env.S3_BUCKET_NAME = 'TestBucket';
        process.env.AWS_REGION = 'us-east-1';
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

        rekognitionMock.on(DetectTextCommand).resolves(__rekresponse__.rekResponse);

        sfnMock.on(SendTaskSuccessCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(new Error('Fake Task failure'), null);
            }
        });

        sfnMock.on(SendTaskFailureCommand).callsFake((params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it('should execute the lambda function', async () => {
        const axiosStub = sinon.stub(axios.default, 'get').callsFake(async () => {
            return {
                status: 200,
                data: fs.createReadStream(`${__dirname}/text.png`),
                headers: [
                    {
                        'content-type': 'image/jpeg'
                    },
                    {
                        'content-length': '10256'
                    }
                ]
            };
        });

        await lambda.handler(__test__.event_with_entities).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
        });

        axiosStub.restore();
    });

    afterEach(() => {
        s3Mock.restore();
        rekognitionMock.restore();
        sfnMock.restore();
        jest.clearAllMocks();
        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
