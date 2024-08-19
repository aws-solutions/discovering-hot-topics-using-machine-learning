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

const RawFeedStorage = require('../util/raw-data-storage');
const __test_data__ = require('./trascribe-call-event-test-data');

describe('when normalizing transcribe data and publishing to firehose', () => {
    beforeEach(() => {
        firehoseMock.reset();
        process.env.CUSTOMINGESTIONITEM_FEED_STORAGE = 'customingestionitem_feed_storage';
        process.env.CUSTOMINGESTIONLOUDNESS_FEED_STORAGE = 'customingestionloudness_feed_storage';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        firehoseMock.on(PutRecordBatchCommand).callsFake((error, callback) => {
            callback(null, {
                'Encrypted': true,
                'FailedPutCount': 0
            });
        });
    });

    afterEach(() => {
        firehoseMock.restore();
        delete process.env.CUSTOMINGESTIONITEM_FEED_STORAGE;
        delete process.env.CUSTOMINGESTIONLOUDNESS_FEED_STORAGE;
        delete process.env.AWS_SDK_USER_AGENT;
    });

    it('should be successful when calling transcribe storage', async () => {
        const spy = sinon.spy(RawFeedStorage, 'trascribeFeed');
        expect(await RawFeedStorage.trascribeFeed(__test_data__.event_transcribed_data.detail)).to.be.undefined;
        assert.equal(spy.callCount, 1);
        spy.restore();
    });
});
