/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const sinon = require('sinon');
const AWSMock = require('aws-sdk-client-mock');
const { FirehoseClient, PutRecordBatchCommand, PutRecordCommand } = require('@aws-sdk/client-firehose');
const firehoseMock = AWSMock.mockClient(FirehoseClient);
const { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } = require('@aws-sdk/client-sfn');
const sfnMock = AWSMock.mockClient(SFNClient);
const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');
const translateMock = AWSMock.mockClient(TranslateClient);
const chai = require('chai');
const expect = chai.expect;

const lambda = require('../index.js');
const __test_event__ = require('./event-test-data');

describe('When workflow->translate text is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        translateMock.reset();
        firehoseMock.reset();
        sfnMock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';

        lambdaSpy = sinon.spy(lambda, 'handler');
        translateMock.on(TranslateTextCommand).resolves({
            TranslatedText: 'Success',
            SourceLanguageCode: 'fr',
            TargetLanguageCode: 'en'
        });

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
            });
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

    it('should receive event correctly', async () => {
        if (!lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__.event))[0].account_name).to.equal('twitter');
    });

    it('should translate text correctly', async () => {
        expect((await lambda.handler(__test_event__.event))[0].feed._translated_text).to.equal(
            'This is a sample tweet'
        );
    });

    it('should translate text correctly', async () => {
        expect((await lambda.handler(__test_event__.event_fr))[0].feed._translated_text).to.equal('Success');
    });

    it(' should stream data to Firehose', async () => {
        const response = await firehoseMock.send(
            new PutRecordCommand({
                DeliveryStreamName: process.env.KINESIS_FIREHOSE_FOR_SOURCE,
                Record: {
                    Data: `${JSON.stringify(__test_event__.event._translated_text)}\n`
                }
            })
        );
    });

    it('should translate text correctly', async () => {
        expect((await lambda.handler(__test_event__.event_zh_cn))[0].feed._translated_text).to.equal('Success');
    });

    it('should translate text correctly', async () => {
        expect((await lambda.handler(__test_event__.event_zh_tw))[0].feed._translated_text).to.equal('Success');
    });

    afterEach(() => {
        translateMock.restore();
        firehoseMock.restore();
        sfnMock.restore();
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_REGION;
    });
});

describe('translate throws an error', () => {
    beforeEach(() => {
        translateMock.reset();
        firehoseMock.reset();
        sfnMock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        translateMock.on(TranslateTextCommand).callsFake((error, callback) => {
            callback(error, null);
        });

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
            });
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

    it('lambda function should throw an error', async () => {
        await lambda.handler(__test_event__.event);
    });

    afterEach(() => {
        translateMock.restore();
        firehoseMock.restore();
        sfnMock.restore();
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('Firehose throws an error', () => {
    beforeEach(() => {
        translateMock.reset();
        firehoseMock.reset();
        sfnMock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_TWITTER = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        translateMock.on(TranslateTextCommand).resolves({
            TranslatedText: 'Success',
            SourceLanguageCode: 'fr',
            TargetLanguageCode: 'en'
        });

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(new Error('Firehose mock error'), null);
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

    it('lambda function should throw an error', async () => {
        await lambda.handler(__test_event__.event);
    });

    afterEach(() => {
        translateMock.restore();
        firehoseMock.restore();
        sfnMock.restore();
        delete process.env.KINESIS_FIREHOSE_FOR_TWITTER;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('Test feed with embedded text', () => {
    beforeEach(() => {
        translateMock.reset();
        firehoseMock.reset();
        sfnMock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.KINESIS_FIREHOSE_FOR_SOURCE = 'TestArn';
        process.env.AWS_REGION = 'us-east-1';

        translateMock.on(TranslateTextCommand).resolves({
            TranslatedText: 'Success',
            SourceLanguageCode: 'fr',
            TargetLanguageCode: 'en'
        });

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
            });
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

    it('lambda function should throw an error', async () => {
        const response = await lambda.handler(__test_event__.event_with_embedded_text);
        expect(response[0].text_in_images[0]._cleansed_text).to.equal("It's monday  keep similing");
    });

    afterEach(() => {
        translateMock.restore();
        firehoseMock.restore();
        sfnMock.restore();
        delete process.env.KINESIS_FIREHOSE_FOR_SOURCE;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
