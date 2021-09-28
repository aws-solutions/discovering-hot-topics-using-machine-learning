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

"use strict"

const sinon = require('sinon');
const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
const chai = require('chai')
const expect = chai.expect

const lambda = require('../index.js');
const __test_event__ = require('./event-test-data');
const assert = require('assert');

describe('When workflow->translate text is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';

        lambdaSpy = sinon.spy(lambda, 'handler');

        AWSMock.mock('Translate', 'translateText', (error, callback) => {
            callback(null, {
                TranslatedText: 'Success',
                SourceLanguageCode: 'fr',
                TargetLanguageCode: 'en'
            });
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
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

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__.event))[0].account_name).to.equal('twitter');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event))[0].feed._translated_text).to.equal('This is a sample tweet');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_fr))[0].feed._translated_text).to.equal('Success');
    });

    it (' should stream data to Firehose', async () => {
        const firehose = AWS.Firehose();
        const response = await firehose.putRecord({
            DeliveryStreamName: process.env.KINESIS_FIREHOSE_FOR_SOURCE,
            Record: {
                Data: `${JSON.stringify(__test_event__.event._translated_text)}\n`
            }
        })
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_zh_cn))[0].feed._translated_text).to.equal('Success');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_zh_tw))[0].feed._translated_text).to.equal('Success');
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_REGION;
    });
});

describe('translate throws an error', () => {
    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('Translate', 'translateText', (error, callback) => {
            callback(error, null);
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
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

    it ('lambda function should throw an error', async () => {
        await lambda.handler(__test_event__.event);
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        AWSMock.restore('StepFunctions');
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('Firehose throws an error', () => {
    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_TWITTER = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('Translate', 'translateText', (error, callback) => {
            callback(null, {
                TranslatedText: 'Success',
                SourceLanguageCode: 'fr',
                TargetLanguageCode: 'en'
            });
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(new Error('Firehose mock error'), null);
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

    it ('lambda function should throw an error', async () => {
        await lambda.handler(__test_event__.event);
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        AWSMock.restore('StepFunctions');
        delete process.env.KINESIS_FIREHOSE_FOR_TWITTER;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});


describe('Test feed with embedded text', () => {
    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('Translate', 'translateText', (error, callback) => {
            callback(null, {
                TranslatedText: 'Success',
                SourceLanguageCode: 'fr',
                TargetLanguageCode: 'en'
            });
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
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

    it ('lambda function should throw an error', async () => {
        const response = await lambda.handler(__test_event__.event_with_embedded_text);
        expect(response[0].text_in_images[0]._cleansed_text).to.equal('It\'s monday keep similing');
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        AWSMock.restore('StepFuntions');
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
