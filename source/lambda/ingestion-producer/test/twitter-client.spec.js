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
const Twit = require('twitter-lite');

const AccountSecrets = require('../util/account-secrets');
const TwitterClient = require('../util/twitter-client');

describe('When testing the twitter-client', () => {

    let ssmStub;
    let twitStub;
    let twitterClient;

    beforeEach (() => {
        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.DDB_TABLE_NAME = 'test_table';
        process.env.AWS_REGION = 'us-east-1';
        process.env.CAP_NUM_RECORD = '100';

        ssmStub = sinon.stub(AccountSecrets.prototype, 'getSecretValue').returns("SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ");

        twitStub = sinon.stub(Twit.prototype, 'get').returns({
            statuses: [{
                "created_at": "Mon May 06 20:01:29 +0000 2019",
                "id": 12345678901234567890,
                "id_str": "12345678901234567890",
                "text": "This is a sample tweet",
                "truncated": true,
                "retweet_count": 20,
                "favorite_count": 44,
                "favorited": false,
                "retweeted": false,
                "possibly_sensitive": false,
                "lang": "en"
            },
            {
                "created_at": "Sat May 04 15:00:33 +0000 2019",
                "id": 12345678901234567891,
                "id_str": "12345678901234567891",
                "text": "This is 2nd sample text",
                "truncated": true,
                "geo": null,
                "coordinates": null,
                "place": null,
                "contributors": null,
                "is_quote_status": false,
                "retweet_count": 12,
                "favorite_count": 27,
                "favorited": false,
                "retweeted": false,
                "possibly_sensitive": false,
                "lang": "en"
            }],
            "search_metadata": {
                "completed_in": 0.047,
                "max_id": 98765432109876543,
                "max_id_str": "98765432109876543",
                "next_results": "?max_id=98765432109876543&q=from%3Atwitterdev&count=2&include_entities=1&result_type=mixed",
                "query": "from%3Atwitterdev",
                "refresh_url": "?since_id=98765432109876543&q=from%3Atwitterdev&result_type=mixed&include_entities=1",
                "count": 2,
                "since_id": 0,
                "since_id_str": "0"
            }
        });

        AWSMock.mock('DynamoDB', 'query', function(error, callback) {
            callback(null, {
                Items:[
                {
                    MAX_ID: {S: "123"}
                }
            ]});
        });

        AWSMock.mock('DynamoDB', 'putItem', function(error, callback) {
            callback(null, 'Success');
        });

        process.env.QUERY_PARAM = "some%20fake%20search%20params"

        twitterClient = new TwitterClient('twitter');
    });

    it ('should search tweets', async () => {
        const response = await twitterClient.searchTweets("some%20fake%20search%20params", 'en');
        expect(response[0].id_str).to.equal("12345678901234567890");
    });

    it ('should create twitter client object', async () => {
        const response = await twitterClient.init();
        expect(response.config.bearer_token).to.equal('SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ');
    });

    afterEach(() => {
        ssmStub.restore();
        twitStub.restore();

        delete process.env.SOLUTION_NAME;
        delete process.env.DDB_TABLE_NAME;
        delete process.env.AWS_REGION;
        delete process.env.QUERY_PARAM;
        delete process.env.CAP_NUM_RECORD;
        AWSMock.restore('DynamoDB');
    });
});