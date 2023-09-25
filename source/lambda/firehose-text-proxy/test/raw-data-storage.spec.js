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

'use strict';

const sinon = require('sinon');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-client-mock');
const { FirehoseClient, PutRecordBatchCommand } = require('@aws-sdk/client-firehose');
const firehoseMock = AWSMock.mockClient(FirehoseClient);
const assert = require('assert');

const __test_data__ = require('./news-feed-even-test-data');
const RawFeedStorage = require('../util/raw-data-storage');

describe('when storing news feeds', () => {
    beforeEach(() => {
        process.env.NEWSFEEDS_FEED_STORAGE = 'fake_news_feed_storage';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        firehoseMock.on(PutRecordBatchCommand).callsFake((params, callback) => {
            console.log(params);
            if (
                params.Record.Data ===
                    '{"account_name":"url_params","platform":"newsfeeds","created_at":"2021-06-23 02:30:06",' +
                        '"entities":{"media":[],"urls":[{"expanded_url":"https://fakeurl.com"}]},"extended_entities":{"media":[],' +
                        '"urls":[{"expanded_url":"https://fakeurl.com"}]},"lang":"en","id_str":"fakenumber#fakesite#0","text":"some fake news","metadata":' +
                        '{"website":"fakeurl","country":"None","topic":"faketopic"}}\n' &&
                params.DeliveryStreamName === 'fake_news_feed_storage'
            ) {
                callback(null, {
                    'Encrypted': true,
                    'RecordId': 'fakerecordid'
                });
            } else {
                callback(new Error('Received invalid parameters'), null);
            }
        });
        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                'Encrypted': true,
                'FailedPutCount': 0
            });
        });
    });

    afterEach(() => {
        firehoseMock.restore();
        delete process.env.NEWSFEEDS_FEED_STORAGE;
        delete process.env.AWS_SDK_USER_AGENT;
    });

    it('should store them successfully', async () => {
        const spy = sinon.spy(RawFeedStorage, 'storeFeed');
        expect(await RawFeedStorage.storeFeed(__test_data__._news_feed_event.detail)).to.be.undefined;
        assert.equal(spy.callCount, 1);
        spy.restore();
    });
});
