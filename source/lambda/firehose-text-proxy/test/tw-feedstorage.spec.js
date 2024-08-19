/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const sinon = require('sinon');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-client-mock');
const { FirehoseClient, PutRecordBatchCommand } = require('@aws-sdk/client-firehose');
const firehoseMock = AWSMock.mockClient(FirehoseClient);
const assert = require('assert');

const __test_data__ = require('./event-test-data');
const TwRawStorage = require('../util/tw-feed-storage');

describe('test writing tweets', () => {
    beforeEach(() => {
        firehoseMock.reset();
        process.env.TW_FEED_STORAGE = 'twfeedstorage';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                'Encrypted': true,
                'RecordId': '49607933892580429045866716038015163261214518926441971714'
            });
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
        delete process.env.TW_FEED_STORAGE;
        delete process.env.AWS_SDK_USER_AGENT;
    });

    it('should store the image analyzed information', async () => {
        const spy = sinon.spy(TwRawStorage, 'storeTweets');
        expect(await TwRawStorage.storeTweets(__test_data__.event.detail)).to.be.undefined;
        assert.equal(spy.callCount, 1);
        spy.restore();
    });
});
