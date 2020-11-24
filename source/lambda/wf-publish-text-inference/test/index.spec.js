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
const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
const assert = require('assert');
const chai = require('chai')
const expect = chai.expect;

describe ('When workflow->publsh inference is called', () => {
    let lambdaSpy;

    const event = {
      "account_name": "twitter",
      "platform": "twitter",
      "search_query": "Abc",
      "feed": {
        "created_at": "Fri Jul 03 20:00:35 +0000 2020",
        "id": 1234567890123456789,
        "id_str": "1234567890123456789",
        "text": "This is twitter sample text",
        "truncated": false,
        "entities": {
          "hashtags": [],
          "symbols": [],
          "user_mentions": [],
          "urls": []
        },
        "metadata": {
          "iso_language_code": "ja",
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
        "lang": "ja",
        "_translated_text": "This is sample text from a tweet",
        "_cleansed_text": "This is sample text from a tweet"
      },
      "Sentiment": "NEGATIVE",
      "SentimentScore": {
        "Positive": 0.0233322586864233,
        "Negative": 0.5335382223129272,
        "Neutral": 0.44307705760002136,
        "Mixed": 0.000052486080676317215
      },
      "Entities": [
        {
          "Score": 0.9814663529396057,
          "Type": "PERSON",
          "Text": "Person",
          "BeginOffset": 1,
          "EndOffset": 12
        },
        {
          "Score": 0.9663130640983582,
          "Type": "PERSON",
          "Text": "Person",
          "BeginOffset": 13,
          "EndOffset": 24
        }
      ],
      "KeyPhrases": [
        {
          "Score": 0.9998056292533875,
          "Text": "Person Person",
          "BeginOffset": 1,
          "EndOffset": 24
        },
        {
          "Score": 0.9999963045120239,
          "Text": "past eventsBut",
          "BeginOffset": 45,
          "EndOffset": 59
        }
      ]
    }

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.EVENT_BUS_NAME = 'TEST_EVENT_BUS';
        process.env.EVENT_NAMESPACE = 'com.test.event';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('EventBridge', 'putEvents', (error, callback) => {
            callback(null, {
                "FailedEntryCount": 0,
                "Entries": [{
                    "EventId": "94f34661-daf9-a944-9b4a-787653358a74"
                }]
            })
        });
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(event)).FailedEntryCount).to.equal(0);
    });

    it ('should call eventbridge without any failures', async () => {
        const eventBridge = new AWS.EventBridge();
        const response = await eventBridge.putEvents({
            Entries: [{
                EventBusName: process.env.EVENT_BUS_NAME,
                DetailType: `${event.account_name}.${event.platform}`,
                Detail: JSON.stringify(event),
                Source: 'com.analyze.inference'
            }]
        }).promise();

        expect(response.FailedEntryCount).to.equal(0);
        expect(response.Entries[0].EventId).to.equal('94f34661-daf9-a944-9b4a-787653358a74');
    });

    afterEach(() => {
        lambdaSpy.restore();
        delete process.env.EVENT_BUS_NAME;
        delete process.env.EVENT_NAMESPACE;
        delete process.env.AWS_REGION;

        AWSMock.restore('EventBridge');
    });
});

describe('Error scenarios', () => {

    const event = {
        "account_name": "twitter",
        "platform": "twitter",
        "search_query": "Abc",
        "feed": {
            "created_at": "Fri Jul 03 20:00:35 +0000 2020",
            "id": 1234567890123456789,
            "id_str": "1234567890123456789",
            "text": "This is twitter sample text",
            "truncated": false,
            "entities": {
                "hashtags": [],
                "symbols": [],
                "user_mentions": [],
                "urls": []
            },
            "metadata": {
                "iso_language_code": "ja",
                "result_type": "recent"
            }
        }
    }
    beforeEach(() => {
        AWSMock.mock('EventBridge', 'putEvents', (error, callback) => {
            callback(new Error('Fake error for event bridge'), {
                "FailedEntryCount": 1,
            });
        });
        process.env.EVENT_BUS_NAME = 'TEST_EVENT_BUS';
        process.env.EVENT_NAMESPACE = 'com.test.event';
        process.env.AWS_REGION = 'us-east-1';
    });

    it ('should throw an error', async () => {
        lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert (error.message, 'Fake error for event bridge');
        });
    });

    afterEach(() => {
        delete process.env.EVENT_BUS_NAME;
        delete process.env.EVENT_NAMESPACE;
        delete process.env.AWS_REGION;
        AWSMock.restore('EventBridge');
    });
});

describe ('When FaileEntryCount > 0', () => {
    let lambdaSpy;

    const event = {
      "account_name": "twitter",
      "platform": "twitter",
      "search_query": "Abc",
      "feed": {
        "created_at": "Fri Jul 03 20:00:35 +0000 2020",
        "id": 1234567890123456789,
        "id_str": "1234567890123456789",
        "text": "This is twitter sample text",
        "truncated": false,
        "entities": {
          "hashtags": [],
          "symbols": [],
          "user_mentions": [],
          "urls": []
        },
        "metadata": {
          "iso_language_code": "ja",
          "result_type": "recent"
        }
      },
      "Sentiment": "NEGATIVE",
      "SentimentScore": {
        "Positive": 0.0233322586864233,
        "Negative": 0.5335382223129272,
        "Neutral": 0.44307705760002136,
        "Mixed": 0.000052486080676317215
      },
      "Entities": [
        {
          "Score": 0.9814663529396057,
          "Type": "PERSON",
          "Text": "Person",
          "BeginOffset": 1,
          "EndOffset": 12
        }
      ],
      "KeyPhrases": [
        {
          "Score": 0.9998056292533875,
          "Text": "Person Person",
          "BeginOffset": 1,
          "EndOffset": 24
        }
      ]
    }

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.EVENT_BUS_NAME = 'TEST_EVENT_BUS';
        process.env.EVENT_NAMESPACE = 'com.test.event';
        process.env.AWS_REGION = 'us-east-1';

        AWSMock.mock('EventBridge', 'putEvents', (error, callback) => {
            callback(null, {
                "FailedEntryCount": 1,
                "Entries": [{
                    "EventId": "94f34661-daf9-a944-9b4a-787653358a74"
                }]
            })
        });
    });

    it ('should throw an error', async () => {
        await lambda.handler(event).catch((error) => {
            assert(error.message, 'EventBridge failed to publish an event. Received FailedEntryCount > 0')
        });
    });

    afterEach(() => {
        lambdaSpy.restore();
        delete process.env.EVENT_BUS_NAME;
        delete process.env.EVENT_NAMESPACE;
        delete process.env.AWS_REGION;

        AWSMock.restore('EventBridge');
    });
});