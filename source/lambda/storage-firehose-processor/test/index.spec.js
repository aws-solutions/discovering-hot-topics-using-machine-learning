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

const lambda = require('../index.js');
const sinon = require('sinon');
const expect = require('chai').expect;

describe ('When stream processor is called', () => {
    let lambdaSpy;

    const payload = JSON.stringify({
        "version": "0",
        "id": "772b51be-a0d9-d08f-37c5-730d230d393e",
        "detail-type": "twitter.twitter",
        "source": "com.analyze.inference",
        "account": "1234567890",
        "time": "2020-06-06T02:42:35Z",
        "region": "us-east-1",
        "resources": [],
        "detail": {
            "account_name": "twitter",
            "platform": "twitter",
            "search_query": "Abc",
            "feed": {
                "created_at": "Sat Jun 06 02:42:27 +0000 2020",
                "id": 12345678901234567890,
                "id_str": "12345678901234567890",
                "text": "I am twitter. This is test tweet and used for testing",
                "truncated": false,
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
                "geo": null,
                "coordinates": null,
                "place": null,
                "contributors": null,
                "is_quote_status": false,
                "retweet_count": 0,
                "favorite_count": 0,
                "favorited": false,
                "retweeted": false,
                "lang": "en"
            },
            "Sentiment": "NEUTRAL",
            "SentimentScore": {
                "Positive": 0.061287373304367065,
                "Negative": 0.1737460345029831,
                "Neutral": 0.7649617195129395,
                "Mixed": 4.80770768263028E-6
            },
            "Entities": [{
                "Score": 0.949558436870575,
                "Type": "PERSON",
                "Text": "fakeperson3",
                "BeginOffset": 1,
                "EndOffset": 15
            }, {
                "Score": 0.9926474094390869,
                "Type": "PERSON",
                "Text": "fakeperson2",
                "BeginOffset": 17,
                "EndOffset": 27
            }, {
                "Score": 0.8504671454429626,
                "Type": "PERSON",
                "Text": "fakeperson1",
                "BeginOffset": 73,
                "EndOffset": 79
            }, {
                "Score": 0.44545233249664307,
                "Type": "PERSON",
                "Text": "Movie",
                "BeginOffset": 85,
                "EndOffset": 91
            }, {
                "Score": 0.7254367470741272,
                "Type": "ORGANIZATION",
                "Text": "#organization",
                "BeginOffset": 92,
                "EndOffset": 99
            }],
            "KeyPhrases": [{
                "Score": 0.9563562870025635,
                "Text": "@SomeUser",
                "BeginOffset": 0,
                "EndOffset": 15
            }]
        }
    });

    const event = {
        "invocationId": "invocationIdExample",
        "deliveryStreamArn": "arn:aws:kinesis:EXAMPLE",
        "region": "us-east-1",
        "records": [
            {
            "recordId": "49546986683135544286507457936321625675700192471156785154",
            "approximateArrivalTimestamp": 1495072949453,
            "data": (Buffer.from(payload, 'utf8')).toString('base64')//"SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4="
            }
        ]
    }

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;

        var callback = function(err, result) {
            if (err)
                expect.fail;
            if (result) {
                expect(result.records[0].recordId).to.equal('49546986683135544286507457936321625675700192471156785154');
                expect(JSON.parse(Buffer.from(result.records[0].data, 'base64').toString('utf8')).account_name).to.equal('twitter');
            }
        }

        lambda.handler(event, null, callback);
    });

    afterEach(() => {
        lambdaSpy.restore();
    });
});