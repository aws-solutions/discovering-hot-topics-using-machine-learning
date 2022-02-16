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
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

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

    it('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__.event))[0].account_name).to.equal('twitter');
    });

    it('should not call comprehend sentiment analysis if sentiment is available', async() => {
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.eventWithSentiment);
        expect(response[0].Sentiment).to.equal('POSITIVE');
        expect(response[0].SentimentScore).to.eql({});
    });

    it('should call comprehend sentiment even if sentiment is available', async() => {
        process.env.REPROCESS_SENTIMENT = "TRUE"
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.eventWithSentiment);
        expect(response[0].Sentiment).to.equal('NEUTRAL');
        expect(response[0].SentimentScore).to.eql({
            "Positive": 0.003071434795856476,
            "Negative": 0.0034885697532445192,
            "Neutral": 0.9934296011924744,
            "Mixed": 0.000010461636520631146
        });
    });

    it('should return empty sentiment, key phrase and entities in json target element', async() => {
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.eventWithEmptyText);
        expect(response[0].SentimetScore).to.be.undefined;
        expect(response[0].Sentiment).to.equal("");
        expect(response[0].KeyPhrases).to.be.empty;
        expect(response[0].Entities).to.be.empty;
    });    

    it('should analyze embedded text -> post rek', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.eventWithRekText);
        expect(response[0].account_name).to.equal('twitter');
        expect(response[0].text_in_images[0].text).to.equal('It\'s Monday. Have a nice day');
        expect(response[0].text_in_images[0].Sentiment).to.equal('NEUTRAL');
        expect(response[0].text_in_images[0].Entities[1].Text).to.equal('organization');
        expect(response[0].text_in_images[0].KeyPhrases[1].Text).to.equal('Some fake movie name');
    });

    it('should call comprehend -> detect sentiment', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectSentiment({
            Text: `${JSON.parse(__test_event__.event.Records[0].body).input.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Sentiment).to.equal('NEUTRAL');
    });

    it('should call comprehend -> detect sentiment', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectSentiment({
            Text: `${JSON.parse(__test_event__.event.Records[0].body).input.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Sentiment).to.equal('NEUTRAL');
    });


    it('should call comprehend -> detect entities', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectEntities({
            Text: `${JSON.parse(__test_event__.event.Records[0].body).input.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.Entities[0].Type).to.equal('PERSON');
    });

    it('should call comprehend -> key phrases', async () => {
        const comprehend = new AWS.Comprehend();
        const response = await comprehend.detectKeyPhrases({
            Text: `${JSON.parse(__test_event__.event.Records[0].body).input.feed._cleansed_text}`,
            LanguageCode: 'en'
        }).promise();

        expect(response.KeyPhrases[0].Score).to.equal(1);
    });

    it('throw error when publishing task fails', async() => {
        AWSMock.remock('StepFunctions', 'sendTaskSuccess', (error, callback) => {
            callback(new Error('Fake failure when sending task success'), null);
        });

        AWSMock.remock('StepFunctions', 'sendTaskFailure', (error, callback) => {
            callback(new Error('Fake error when sending task failure failure'), null);
        });        

        await lambda.handler(__test_event__.event).catch((error) => {
            if (error.message instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Fake error when sending task failure failure');
        });
    });

    it('should have sentiment empty if response is undefined', async() => {
        AWSMock.remock('Comprehend', 'detectSentiment', (error, callback) => {
            callback(null, undefined);
        });
        if (! lambdaSpy.threw()) expect.fail;
        const response = await lambda.handler(__test_event__.event);
        expect(response[0].Sentiment).to.equal("");
        expect(response[0].SentimentScore).to.eql({});
    });
    
    afterEach(() => {
        AWSMock.restore('Comprehend');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Error scenarios', () => {
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

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

    describe('error in sentiment analysis', () => {
        beforeEach(() => {
            process.env.AWS_SDK_USER_AGENT;

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
            process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

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
            process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

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
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
