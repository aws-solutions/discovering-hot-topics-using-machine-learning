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

const expect = require('chai').expect;
const sinon = require('sinon');
const AWSMock = require('aws-sdk-mock');
const path = require('path');
const lambda = require('../index.js');
const TwitterClient = require('../util/twitter-client');

AWSMock.setSDK(path.resolve('./node_modules/aws-sdk'));

describe('when producer lambda is invoked', () => {
    let twitterClientStub;
    let lambdaSpy;

    beforeEach(() => {
        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').returns(
            [{
                "created_at": "Mon May 06 20:01:29 +0000 2019",
                "id": 12345678901234567890,
                "id_str": "12345678901234567890",
                "text": "This is a sample tweet",
                "truncated": true,
                "entities": {
                    "hashtags": [],
                    "symbols": [],
                    "user_mentions": [],
                    "urls": []
                },
                "metadata": {
                    "iso_language_code": "en",
                    "result_type": "recent"
                },
                "lang": "en"
            },
            {
                "created_at": "Sat May 04 15:00:33 +0000 2019",
                "id": 12345678901234567891,
                "id_str": "12345678901234567891",
                "text": "This is the 2nd sample tweet",
                "truncated": true,
                "entities": {
                    "hashtags": [],
                    "symbols": [],
                    "user_mentions": [],
                    "urls": []
                },
                "metadata": {
                    "iso_language_code": "en",
                    "result_type": "recent"
                },

                "lang": "en"
            }]
        );

        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STREAM_NAME = 'teststream';
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';

    });

    it('should process event and call twitter api', async() => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        const event = {
            "messageId": "19dd0b57-b21e-4ac1-bd88-01bbb068cb78",
            "receiptHandle": "MessageReceiptHandle",
            "body": {
                account_name: 'Twitter',
                platform: 'Twitter'
            },
            "attributes": {
              "ApproximateReceiveCount": "1",
              "SentTimestamp": "1523232000000",
              "SenderId": "fakeSenderId",
              "ApproximateFirstReceiveTimestamp": "1523232000001"
            },
            "messageAttributes": {},
            "md5OfBody": "7b270e59b47ff90a553787216d55d91d",
            "eventSource": "aws:sqs",
            "eventSourceARN": "arn:aws:sqs:us-east-1:FAKEACCOUNT:MyQueue",
            "awsRegion": "us-east-1"
        }

        if (! lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
    });

    afterEach(() => {
        AWSMock.restore('Kinesis');
        twitterClientStub.restore();
        lambdaSpy.restore();
        delete process.env.SOLUTION_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SUPPORTED_LANG;
    });
});