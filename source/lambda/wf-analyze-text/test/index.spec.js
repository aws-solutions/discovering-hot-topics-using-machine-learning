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

const AWS = require('aws-sdk');
const sinon = require('sinon');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-mock');
const assert = require('assert');

const lambda = require('../index.js');
const __test_event__ = require('./lambda-event-data');

describe ('When workflow->analyze text is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');
        process.env.AWS_REGION = 'us-east-1';
        AWSMock.mock('Comprehend', 'detectSentiment', (error, callback) => {
            callback(null, {
                "Sentiment": "NEUTRAL",
                "SentimentScore": {
                  "Positive": 0.003071434795856476,
                  "Negative": 0.0034885697532445192,
                  "Neutral": 0.9934296011924744,
                  "Mixed": 0.000010461636520631146
                }
            });
        });

        AWSMock.mock('Comprehend', 'detectEntities', (error, callback) => {
            callback(null, {
                "Entities": [{
                    "Score": 0.7248516082763672,
                    "Type": "PERSON",
                    "Text": "person",
                    "BeginOffset": 3,
                    "EndOffset": 11
                },
                {
                    "Score": 0.9996819496154785,
                    "Type": "ORGANIZATION",
                    "Text": "organization",
                    "BeginOffset": 13,
                    "EndOffset": 19
                },
                {
                    "Score": 0.9996181726455688,
                    "Type": "OTHER",
                    "Text": "https://t.co/Test113",
                    "BeginOffset": 33,
                    "EndOffset": 56
                }]
            });
        });

        AWSMock.mock('Comprehend', 'detectKeyPhrases', (error, callback) => {
            callback(null, {
                "KeyPhrases": [{
                    "Score": 1,
                    "Text": "RT",
                    "BeginOffset": 0,
                    "EndOffset": 2
                },
                {
                    "Score": 0.9999982714653015,
                    "Text": "Some fake movie name",
                    "BeginOffset": 13,
                    "EndOffset": 26
                }]
            });
        });
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__.event)).account_name).to.equal('twitter');
    });

    it ('should analyze embedded text -> post rek', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.eventWithRekText);
        expect(response.account_name).to.equal('twitter');
        expect(response.text_in_images[0].text).to.equal('It\'s Monday. Have a nice day');
        expect(response.text_in_images[0].Sentiment).to.equal('NEUTRAL');
        expect(response.text_in_images[0].Entities[1].Text).to.equal('organization');
        expect(response.text_in_images[0].KeyPhrases[1].Text).to.equal('Some fake movie name');
    });



    it ('should call comprehend -> detect sentiment', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectSentiment({
            Text: `${__test_event__.event.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Sentiment).to.equal('NEUTRAL');
    });

    it ('should call comprehend -> detect sentiment', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectSentiment({
            Text: `${__test_event__.event.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Sentiment).to.equal('NEUTRAL');
    });


    it ('should call comprehend -> detect entities', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectEntities({
            Text: `${__test_event__.event.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Entities[0].Type).to.equal('PERSON');
    });

    it ('should call comprehend -> key phrases', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectKeyPhrases({
            Text: `${__test_event__.event.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.KeyPhrases[0].Score).to.equal(1);
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        lambdaSpy.restore();
        delete process.env.AWS_REGION;
    });
});


describe('Error scenarios', () => {
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');
        process.env.AWS_REGION = 'us-east-1';
        AWSMock.mock('Comprehend', 'detectSentiment', (error, callback) => {
            callback(null, {
                "Sentiment": "NEUTRAL",
                "SentimentScore": {
                  "Positive": 0.003071434795856476,
                  "Negative": 0.0034885697532445192,
                  "Neutral": 0.9934296011924744,
                  "Mixed": 0.000010461636520631146
                }
            });
        });

        AWSMock.mock('Comprehend', 'detectEntities', (error, callback) => {
            callback(null, {
                "Entities": [{
                    "Score": 0.7248516082763672,
                    "Type": "PERSON",
                    "Text": "person",
                    "BeginOffset": 3,
                    "EndOffset": 11
                },
                {
                    "Score": 0.9996819496154785,
                    "Type": "ORGANIZATION",
                    "Text": "organization",
                    "BeginOffset": 13,
                    "EndOffset": 19
                },
                {
                    "Score": 0.9996181726455688,
                    "Type": "OTHER",
                    "Text": "https://t.co/Test113",
                    "BeginOffset": 33,
                    "EndOffset": 56
                }]
            });
        });

        AWSMock.mock('Comprehend', 'detectKeyPhrases', (error, callback) => {
            callback(null, {
                "KeyPhrases": [{
                    "Score": 1,
                    "Text": "RT",
                    "BeginOffset": 0,
                    "EndOffset": 2
                },
                {
                    "Score": 0.9999982714653015,
                    "Text": "Some fake movie name",
                    "BeginOffset": 13,
                    "EndOffset": 26
                }]
            });
        });
    });

    describe('error in sentiment analysis', () => {
        beforeEach(() => {
            AWSMock.remock('Comprehend', 'detectSentiment', (error, callback) => {
                callback(new Error('Throttling error'), null);
            });
        });

        it('should throw an error', async() => {
            await lambda.handler(__test_event__.eventWithRekText).catch((error) => {
                if (error.message instanceof assert.AssertionError) {
                    assert.fail();
                }
                assert.equal(error.message, 'Throttling error');
            });
        });
    });


    describe('error in keyphrase detection', () => {
        beforeEach(() => {
            AWSMock.remock('Comprehend', 'detectKeyPhrases', (error, callback) => {
                callback(new Error('Throttling error'), null);
            });
        });

        it('should throw an error', async() => {
            await lambda.handler(__test_event__.eventWithRekText).catch((error) => {
                if (error.message instanceof assert.AssertionError) {
                    assert.fail();
                }
                assert.equal(error.message, 'Throttling error');
            });
        });
    });

    describe('error in entity detection', () => {
        beforeEach(() => {
            AWSMock.remock('Comprehend', 'detectEntities', (error, callback) => {
                callback(new Error('Throttling error'), null);
            });
        });

        it('should throw an error', async() => {
            await lambda.handler(__test_event__.eventWithRekText).catch((error) => {
                if (error.message instanceof assert.AssertionError) {
                    assert.fail();
                }
                assert.equal(error.message, 'Throttling error');
            });
        });
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        lambdaSpy.restore();
        delete process.env.AWS_REGION;
    });
});
