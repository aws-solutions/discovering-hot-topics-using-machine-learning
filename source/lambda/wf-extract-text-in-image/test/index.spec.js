/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
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

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
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

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
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

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
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

        s3Mock.on(UploadPartCommand).callsFake((error, callback) => {
            callback(null, () => {
                return new Promise((resolve) => {
                    resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
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
            callback(null, () => {
                return new Promise((resolve) => {
                    resolve({
                        ETag: 'SomeETag',
                        Location: 'PublicWebsiteLink',
                        Key: 'RandomKey',
                        Bucket: 'TestBucket'
                    });
                });
            });
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
        delete process.env.AWS_REGION;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
