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

const expect = require('chai').expect;
const sinon = require('sinon');
const AWSMock = require('aws-sdk-mock');
const assert = require('assert');


const lambda = require('../index.js');
const TwitterClient = require('../util/twitter-client');

describe('when producer lambda is invoked', () => {
    let twitterClientStub;
    let checkLimitStub;
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').returns({
            _headers: {
                status: '200 OK',
                'x-rate-limit-reset': Date.now() + (15*1000*60),
                'x-rate-limit-limit': 450,
                'x-rate-limit-remaining': 400,
            },
            statuses: [{
                "created_at": "Mon May 06 20:01:29 +0000 2019",
                "id": 'fakeID',
                "id_str": "fakeID",
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
                "id": 'fakeID',
                "id_str": "fakeID",
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
        });

        checkLimitStub = sinon.stub(TwitterClient.prototype, 'hasLimit').returns(
            400
        );

        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STREAM_NAME = 'teststream';
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';
        process.env.QUERY_RESULT_TYPE = 'popular'

    });

    it('should process event and call twitter api', async () => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        if (! lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
    });

    it('should insert geo coordinates', async () => {
        process.env.LOCATION_GEOCODE = '0,0,5km';

        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        if (! lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;

        delete process.env.LOCATION_GEOCODE;
    });

    afterEach(() => {
        AWSMock.restore('Kinesis');
        twitterClientStub.restore();
        checkLimitStub.restore();
        lambdaSpy.restore();
        delete process.env.SOLUTION_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SUPPORTED_LANG;
        delete process.env.QUERY_RESULT_TYPE;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('check loop execution based on throttling', () => {
    let twitterClientStub;
    let checkLimitStub;
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').returns({
            _headers: {
                status: '200 OK',
                'x-rate-limit-reset': Date.now() + (15*1000*60),
                'x-rate-limit-limit': 450,
                'x-rate-limit-remaining': 2,
            },
            statuses: [{
                "created_at": "Mon May 06 20:01:29 +0000 2019",
                "id": 'fakeID',
                "id_str": "fakeID",
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
                "id": 'fakeID',
                "id_str": "fakeID",
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
        });

        checkLimitStub = sinon.stub(TwitterClient.prototype, 'hasLimit').returns(
            2
        );

        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STREAM_NAME = 'teststream';
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';
        process.env.QUERY_RESULT_TYPE = 'popular'
    });

    it ('should tweet search only twice', async () => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        if (! lambdaSpy.threw()) expect.fail;
        await lambda.handler(event);
        sinon.assert.calledTwice(twitterClientStub);
    });

    afterEach(() => {
        AWSMock.restore('Kinesis');
        twitterClientStub.restore();
        checkLimitStub.restore();
        lambdaSpy.restore();
        delete process.env.SOLUTION_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SUPPORTED_LANG;
        delete process.env.QUERY_RESULT_TYPE;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('No remaining limit', () => {
    let twitterClientStub;
    let checkLimitStub;
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').returns({
            _headers: {
                status: '200 OK',
                'x-rate-limit-reset': Date.now() + (15*1000*60),
                'x-rate-limit-limit': 450,
                'x-rate-limit-remaining': 0,
            },
            statuses: [{
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
            }]
        });

        checkLimitStub = sinon.stub(TwitterClient.prototype, 'hasLimit').returns(
            0
        );

        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STREAM_NAME = 'teststream';
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';
        process.env.QUERY_RESULT_TYPE = 'popular'
    });

    it ('should not call the twitter search endpoint', async () => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        if (! lambdaSpy.threw()) expect.fail;
        await lambda.handler(event);
        sinon.assert.callCount(twitterClientStub, 0);
    });

    afterEach(() => {
        AWSMock.restore('Kinesis');
        twitterClientStub.restore();
        checkLimitStub.restore();
        lambdaSpy.restore();
        delete process.env.SOLUTION_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SUPPORTED_LANG;
        delete process.env.QUERY_RESULT_TYPE;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('Failures are logged by lambda and thrown', () => {
    let twitterClientStub;
    let checkLimitStub;
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STREAM_NAME = 'teststream';
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';
        process.env.QUERY_RESULT_TYPE = 'popular'
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

    });

    it ('should not call the twitter search endpoint', async () => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').throws('SearchTweets', 'Failure');

        checkLimitStub = sinon.stub(TwitterClient.prototype, 'hasLimit').returns(
            10
        );

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Failure');
        });
    });

    it ('should not call the twitter search endpoint', async () => {
        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, "Success");
        });

        twitterClientStub = sinon.stub(TwitterClient.prototype, 'searchTweets').returns({
            _headers: {
                status: '200 OK',
                'x-rate-limit-reset': Date.now() + (15*1000*60),
                'x-rate-limit-limit': 450,
                'x-rate-limit-remaining': 0,
            },
            statuses: [{
                "created_at": "Mon May 06 20:01:29 +0000 2019",
                "id": 'fakeID',
                "id_str": "fakeID",
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
            }]
        });

        checkLimitStub = sinon.stub(TwitterClient.prototype, 'hasLimit').throws('HasCount', 'Failure');

        const event = {
            "source": "aws.events",
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
            "awsRegion": "us-east-1"
        };

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Failure');
        });
    });

    afterEach(() => {
        AWSMock.restore('Kinesis');
        twitterClientStub.restore();
        checkLimitStub.restore();
        lambdaSpy.restore();
        delete process.env.SOLUTION_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SUPPORTED_LANG;
        delete process.env.QUERY_RESULT_TYPE;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
