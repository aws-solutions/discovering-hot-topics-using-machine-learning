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
const AWS = require('aws-sdk');

const FeedProducer = require('../util/feed-producer');

describe('when using the feed producer', () => {
    let feedProducer;

    beforeEach(() => {
        process.env.STREAM_NAME = 'test_stream';

        AWSMock.mock('Kinesis', 'putRecords', (error, callback) => {
            callback(null, {
                "FailedRecordCount": 0,
                "Records": [{
                    "SequenceNumber": "49607379513895389733399918812709686257133734922654056450",
                    "ShardId": "shardId-000000000000"
                },
                {
                    "SequenceNumber": "49607379513895389733399918812710895182953349551828762626",
                    "ShardId": "shardId-000000000000"
                },
                {
                    "SequenceNumber": "49607379513895389733399918812712104108772964181003468802",
                    "ShardId": "shardId-000000000000"
                }],
                "EncryptionType": "KMS"
            });
        });

        feedProducer = new FeedProducer();
    });

    it ('should call Kinesis -> PutRecords with 0 failures', async () => {
        const record = {
            "accountName": "twitter",
            "platform": "twitter",
            "query": "SampleQuery",
            "feed": {
              "created_at": "Wed May 27 02:37:04 +0000 2020",
              "id": 123456789012345678,
              "id_str": "123456789012345678",
              "text": "This is sample text from twitter",
              "truncated": false,
              "entities": {
                "hashtags": [],
                "symbols": [],
                "user_mentions": [],
                "urls": []
              },
              "metadata": {
                "iso_language_code": "es",
                "result_type": "recent"
              },
            }
        };
        const kinesis = AWS.Kinesis();
        const dataRecords = [{
            Data: JSON.stringify(record),
            PartitionKey: record.feed.id_str
        }];
        const response = await kinesis.putRecords({
            Records: dataRecords,
            StreamName: process.env.STREAM_NAME
        }).promise();

        expect(response.FailedRecordCount).to.equal(0);
        expect(response.Records[0].ShardId).to.equal('shardId-000000000000');
    });

    it ('should call FeedProducer -> writeToStream', async () =>{
        const response = await feedProducer.writeToStream(
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
                    "urls": [{
                        "url": "",
                        "expanded_url": "",
                        "display_url": "",
                        "indices": []
                    }]
                },
                "metadata": {
                    "iso_language_code": "en",
                    "result_type": "recent"
                },
                "retweet_count": 20,
                "favorite_count": 44,
                "favorited": false,
                "retweeted": false,
                "possibly_sensitive": false,
                "lang": "en"
            },
            {
                "created_at": "Sat May 04 15:00:33 +0000 2019",
                "id": 1234567890123467891,
                "id_str": "1234567890123467891",
                "text": "The is the 2nd sample tweet",
                "truncated": true,
                "metadata": {
                    "iso_language_code": "en",
                    "result_type": "recent"
                },
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
            {
                accountName: 'twitter', //TODO replace with event.body.accountName
                platform: 'twitter',
                query: 'some%20search%20query', //TODO replace with event.body.query
            }
        );

        expect(response.FailedRecordCount).to.equal(0);
    });

    afterEach(() => {
        delete process.env.STREAM_NAME;
        AWSMock.restore('Kinesis');
    });
});
