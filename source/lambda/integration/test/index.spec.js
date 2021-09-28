/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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

const lambda = require('../index.js');
const sinon = require('sinon');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-mock');

describe ('When stream processor is called', () => {
    let lambdaSpy;

    const event = {
        "version": "0",
        "id": "7b0d4300-702b-d65b-7af7-de7b55ed35e7",
        "detail-type": "twitter.twitter",
        "source": "com.analyze.inference",
        "account": "123456789",
        "time": "2020-06-13T23:14:19Z",
        "region": "us-east-1",
        "resources": [],
        "detail": {
            "account_name": "twitter",
            "platform": "twitter",
            "search_query": "some%20sample%20query",
            "feed": {
                "created_at": "Sat Jun 13 17:07:39 +0000 2020",
                "id": 1234567901235456901,
                "id_str": "1234567901235456901",
                "text": "This is sample text from twitter",
                "truncated": false,
                "entities": {
                    "hashtags": [],
                    "symbols": [],
                    "user_mentions": [],
                    "urls": []
                },
                "metadata": {
                    "iso_language_code": "de",
                    "result_type": "recent"
                },
                "lang": "de",
                "_translated_text": "This is sample text",
                "_cleansed_text": "This is sample text"
            },
            "Sentiment": "NEUTRAL",
            "SentimentScore": {
                "Positive": 0.007853682152926922,
                "Negative": 0.0011625795159488916,
                "Neutral": 0.990983247756958,
                "Mixed": 5.080233904664055e-7
            },
            "Entities": [
                {
                    "Score": 0.5212405920028687,
                    "Type": "ORGANIZATION",
                    "Text": "organization",
                    "BeginOffset": 6,
                    "EndOffset": 15
                },
                {
                    "Score": 0.945159912109375,
                    "Type": "LOCATION",
                    "Text": "location",
                    "BeginOffset": 21,
                    "EndOffset": 29
                }
            ],
            "KeyPhrases": [
                {
                    "Score": 0.9999958276748657,
                    "Text": "organization",
                    "BeginOffset": 6,
                    "EndOffset": 15
                }
            ]
        }
    };

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.STREAM_NAME = 'test_stream';
        process.env.REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('Kinesis', 'putRecord', (error, callback) => {
            callback(null, {
                "ShardId": "shardId-000000000000",
                "SequenceNumber": "49607933892580429045866716038015163261214518926441971714",
                "EncryptionType": "KMS"
            });
        });
    });

    it ('should receive eventbridge event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(event)).SequenceNumber).to.equal("49607933892580429045866716038015163261214518926441971714");
        expect((await lambda.handler(event)).ShardId).to.equal("shardId-000000000000");
        expect((await lambda.handler(event)).EncryptionType).to.equal("KMS");
    });

    afterEach(() => {
        lambdaSpy.restore();

        delete process.env.STREAM_NAME;
        delete process.env.REGION;
        delete process.env.AWS_SDK_USER_AGENT;
        AWSMock.restore('Kinesis');
    });
});