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

 const AWSMock = require('aws-sdk-mock');
 const expect = require('chai').expect;

 const FeedTracker = require('../util/feed-tracker');

 describe('When testing DDB', () => {
     let feedTracker;

    beforeEach(() => {
        process.env.DDB_TABLE_NAME = 'test_table';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('DynamoDB', 'query', (error, callback) => {
            callback(null, {
                Items:[
                {
                    MAX_ID: {S: "123"}
                }
            ]});
        });

        AWSMock.mock('DynamoDB', 'putItem', (error, callback) => {
            callback(null, 'Success');
        });

        feedTracker = new FeedTracker('twitter');
    })

    it ('insert item in the tracker', async() => {
        const response = await feedTracker.updateTracker({
            "completed_in": 0.047,
            "max_id": 12345678901234567890,
            "max_id_str": "12345678901234567890",
            "next_results": "?max_id=12345678901234567890&q=from%3Atwitterdev&count=2&include_entities=1&result_type=mixed",
            "query": "from%3Atwitterdev",
            "refresh_url": "?since_id=12345678901234567890&q=from%3Atwitterdev&result_type=mixed&include_entities=1",
            "count": 2,
            "since_id": 0,
            "since_id_str": "0",
        }, 2, 'en');
        expect(response).to.equal("Success");
    });

    it ('insert item in the tracker without refresh_url', async() => {
        const response = await feedTracker.updateTracker({
            "completed_in": 0.047,
            "max_id": 12345678901234567890,
            "max_id_str": "12345678901234567890",
            "query": "from%3Atwitterdev",
            "refresh_url": "?since_id=12345678901234567890&q=from%3Atwitterdev&result_type=mixed&include_entities=1",
            "count": 2,
            "since_id": 0,
            "since_id_str": "0"
        }, 2, 'en');
        expect(response).to.equal("Success");
    });

    it ('insert item in the tracker without next_results', async () => {
        const response = await feedTracker.updateTracker({
            "completed_in": 0.047,
            "max_id": 12345678901234567890,
            "max_id_str": "12345678901234567890",
            "query": "from%3Atwitterdev",
            "refresh_url": "?since_id=12345678901234567890&q=from%3Atwitterdev&result_type=mixed&include_entities=1",
            "count": 2,
            "since_id": 0,
            "since_id_str": "0"
        }, 2, 'en');
        expect(response).to.equal("Success");
    });

    it ('insert item in the tracker without next_results and refresh_url', async () => {
        const response = await feedTracker.updateTracker({
            "completed_in": 0.047,
            "max_id": 12345678901234567890,
            "max_id_str": "12345678901234567890",
            "query": "from%3Atwitterdev",
            "count": 2,
            "since_id": 0,
            "since_id_str": "0"
        }, 2, 'en');
        expect(response).to.equal("Success");
    });

    it ('should query tracker for ID', async() => {
        const response = await feedTracker.getIDFromTracker('en');
        expect(response).to.equals("123");
    });

    afterEach(() => {
        delete process.env.DDB_TABLE_NAME;
        delete process.env.AWS_REGION;
        AWSMock.restore('DynamoDB');
    });
 });