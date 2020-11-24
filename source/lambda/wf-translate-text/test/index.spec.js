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

        process.env.KINESIS_FIREHOSE_NAME = 'TestArn';
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__.event)).account_name).to.equal('twitter');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event)).feed._translated_text).to.equal('This is a sample tweet');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_fr)).feed._translated_text).to.equal('Success');
    });

    it (' should stream data to Firehose', async () => {
        const firehose = AWS.Firehose();
        const response = await firehose.putRecord({
            DeliveryStreamName: process.env.KINESIS_FIREHOSE_NAME,
            Record: {
                Data: `${JSON.stringify(__test_event__.event._translated_text)}\n`
            }
        })
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_zh_cn)).feed._translated_text).to.equal('Success');
    });

    it ('should translate text correctly', async() => {
        expect((await lambda.handler(__test_event__.event_zh_tw)).feed._translated_text).to.equal('Success');
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        lambdaSpy.restore();
        delete process.env.KINESIS_FIREHOSE_NAME;
    });
});

describe('translate throws an error', () => {
    beforeEach(() => {
        AWSMock.mock('Translate', 'translateText', (error, callback) => {
            callback(error, null);
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                RecordId: '123',
                Encrypted: true
            });
        });

        process.env.KINESIS_FIREHOSE_NAME = 'TestArn';
    });

    it ('lambda function should throw an error', async () => {
        expect(await lambda.handler(__test_event__.event)).to.throw;
    })

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        delete process.env.KINESIS_FIREHOSE_NAME;
    });
});

describe('Firehose throws an error', () => {
    beforeEach(() => {
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

        process.env.KINESIS_FIREHOSE_NAME = 'TestArn';
    });

    it ('lambda function should throw an error', async () => {
        try {
            await lambda.handler(__test_event__.event);
            assert.fail();
        }  catch (error) {
            if (error instanceof assert.AssertionError) {
                throw error;
            }
            assert.equal(error.message, 'Firehose mock error');
        }
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        delete process.env.KINESIS_FIREHOSE_NAME;
    });
});


describe('Test feed with embedded text', () => {
    beforeEach(() => {
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

        process.env.KINESIS_FIREHOSE_NAME = 'TestArn';
    });

    it ('lambda function should throw an error', async () => {
        const response = await lambda.handler(__test_event__.event_with_embedded_text);
        expect(response.text_in_images[0]._cleansed_text).to.equal('It\'s monday keep similing');
    });

    afterEach(() => {
        AWSMock.restore('Translate');
        AWSMock.restore('Firehose');
        delete process.env.KINESIS_FIREHOSE_NAME;
    });
});
