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

 const sinon = require('sinon');
 const expect = require('chai').expect;
 const AWSMock = require('aws-sdk-mock');
 const assert = require('assert');
 
 const RawFeedStorage = require('../util/raw-data-storage');
 const __test_data__ = require('./trascribe-call-event-test-data');

 describe('when normalizing transcribe data and publishing to firehose', () => {
    beforeEach(() => {
        process.env.CUSTOMINGESTIONITEM_FEED_STORAGE = 'customingestionitem_feed_storage';
        process.env.CUSTOMINGESTIONLOUDNESS_FEED_STORAGE = 'customingestionloudness_feed_storage';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                "Encrypted": true,
                "FailedPutCount": 0,
            });
        });
    });

    afterEach(() => {
        AWSMock.restore('Firehose');
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