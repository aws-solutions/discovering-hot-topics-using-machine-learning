/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

"use strict"

const lambda = require('../index.js');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-mock');

const __test_data__ = require('./event-feed-test-data');
const assert = require('assert');

describe('Execute lambda function', () => {
    beforeEach(() => {
        process.env.S3_BUCKET_NAME = 'examplebucket';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [{
                    ETag: "\"70ee1738b6b21e2c8a43f3a5ab0eee71\"",
                    Key: "12345678901234567890/image1.png",
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: "STANDARD"
                }, {
                    ETag: "\"becf17f89c30367a9a44495d62ed521a-1\"",
                    Key: "12345678901234567890/image2.jpg",
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

        AWSMock.mock('Rekognition', 'detectModerationLabels', (error, callback) => {
            callback(null, {
                ModerationLabels: [{
                    Confidence: 0.75,
                    Name: 'BadLabel',
                    ParentName: 'SomeParent'
                }]
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should execute the lambda function successfully', async () => {
        const response = await lambda.handler(__test_data__.event_with_entities);
        expect(response[0].moderation_labels_in_imgs[0].labels[0].Name).to.equal('BadLabel');
    });

    afterEach(() => {
        AWSMock.restore('S3');
        AWSMock.restore('Rekognition');
        AWSMock.restore('StepFunctions');

        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});


describe('Rek found no moderation labels', () => {
    beforeEach(() => {
        process.env.S3_BUCKET_NAME = 'examplebucket';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [{
                    ETag: "\"70ee1738b6b21e2c8a43f3a5ab0eee71\"",
                    Key: "12345678901234567890/image1.png",
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: "STANDARD"
                }, {
                    ETag: "\"becf17f89c30367a9a44495d62ed521a-1\"",
                    Key: "12345678901234567890/image2.jpg",
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

        AWSMock.mock('Rekognition', 'detectModerationLabels', (error, callback) => {
            callback(null, {
                ModerationLabels: []
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should return no Rek moderation labels', async () => {
        const response = await lambda.handler(__test_data__.event_with_entities_for_no_rek_labels);
        expect(response[0].moderation_labels_in_imgs.length).to.be.equal(0);
    });

    afterEach(() => {
        AWSMock.restore('S3');
        AWSMock.restore('Rekognition');
        AWSMock.restore('StepFunctions');

        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Rek throws an error', () => {
    beforeEach(() => {
        process.env.S3_BUCKET_NAME = 'examplebucket';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [{
                    ETag: "\"70ee1738b6b21e2c8a43f3a5ab0eee71\"",
                    Key: "12345678901234567890/image1.png",
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: "STANDARD"
                }, {
                    ETag: "\"becf17f89c30367a9a44495d62ed521a-1\"",
                    Key: "12345678901234567890/image2.jpg",
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

        AWSMock.mock('Rekognition', 'detectModerationLabels', (error, callback) => {
            callback(new Error('Fake Rek Service Error'), null);
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should return no Rek moderation labels', async () => {
        const response = await lambda.handler(__test_data__.event_with_entities_for_no_rek_labels).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Fake Rek Service Error');
        })
    });

    afterEach(() => {
        AWSMock.restore('S3');
        AWSMock.restore('Rekognition');
        AWSMock.restore('StepFunctions');

        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('When Fail to submit successful task', () => {
    beforeEach(() => {
        process.env.S3_BUCKET_NAME = 'examplebucket';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('S3', 'listObjectsV2', (error, callback) => {
            callback(null, {
                Contents: [{
                    ETag: "\"70ee1738b6b21e2c8a43f3a5ab0eee71\"",
                    Key: "12345678901234567890/image1.png",
                    LastModified: new Date(),
                    Size: 11,
                    StorageClass: "STANDARD"
                }, {
                    ETag: "\"becf17f89c30367a9a44495d62ed521a-1\"",
                    Key: "12345678901234567890/image2.jpg",
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

        AWSMock.mock('Rekognition', 'detectModerationLabels', (error, callback) => {
            callback(null, {
                ModerationLabels: [{
                    Confidence: 0.75,
                    Name: 'BadLabel',
                    ParentName: 'SomeParent'
                }]
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(new Error('Fake error when submitting task'), null);
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should return no Rek moderation labels', async () => {
        const response = await lambda.handler(__test_data__.event_with_entities_for_no_rek_labels).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Fake error when submitting task');
        })
    });

    afterEach(() => {
        AWSMock.restore('S3');
        AWSMock.restore('Rekognition');
        AWSMock.restore('StepFunctions');

        delete process.env.S3_BUCKET_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
