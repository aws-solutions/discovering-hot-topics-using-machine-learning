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

const lambda = require('../index.js');
const sinon = require('sinon');
const expect = require('chai').expect;
const AWSMock = require('aws-sdk-mock');
const moment = require('moment');
const assert = require('assert');

const __test_data__ = require('./event-test-data');
const __transcribe_test_data__ = require('./trascribe-call-event-test-data');

describe('When firehose-text-proxy processor is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');
        process.env.CUSTOMINGESTIONITEM_FEED_STORAGE = 'customingestionitem_feed_storage';
        process.env.CUSTOMINGESTIONLOUDNESS_FEED_STORAGE = 'customingestionloudness_feed_storage';
        process.env.CUSTOMINGESTION_FEED_STORAGE = 'customingestion_feed_storage';
        process.env.TEXT_ANALYSIS_NS = 'com.analyze.text.inference';
        process.env.SENTIMENT_FIREHOSE = 'sentiment_stream';
        process.env.ENTITIES_FIREHOSE = 'entity_stream';
        process.env.KEYPHRASE_FIREHOSE = 'keyphrase_stream';
        process.env.MODERATION_LABELS_FIREHOSE = 'moderation_label_fireshose';
        process.env.TW_FEED_STORAGE = 'twitter_feed_storage';
        process.env.TXT_IN_IMG_SENTIMENT_FIREHOSE = 'txt_in_image_sentiment_fireshose';
        process.env.TXT_IN_IMG_ENTITY_FIREHOSE = 'txt_in_image_entity_firehose';
        process.env.TXT_IN_IMG_KEYPHRASE_FIREHOSE = 'txt_in_image_keyphrase_firehose';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        process.env.REGION = 'us-east-1';

        AWSMock.mock('Firehose', 'putRecord', (error, callback) => {
            callback(null, {
                'Encrypted': true,
                'RecordId': '49607933892580429045866716038015163261214518926441971714'
            });
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                'Encrypted': true,
                'FailedPutCount': 0
            });
        });
    });

    it('should receive eventbridge event correctly', async () => {
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(__test_data__.event)).to.be.undefined;
    });

    it('should convert to unix timestamp', async () => {
        const created_at = moment
            .utc('Sat Jun 13 17:07:39 +0000 2020', 'ddd MMM DD HH:mm:ss Z YYYY')
            .format('YYYY-MM-DD HH:mm:ss.SSS');
        expect(created_at).to.equal('2020-06-13 17:07:39.000');
    });

    it('should throw an error', async () => {
        await lambda
            .handler({
                source: 'abc',
                detail: 'meant for failure'
            })
            .catch((error) => {
                if (error instanceof assert.AssertionError) {
                    assert.fail();
                }
                assert.equal(error.message, 'Event source not supported');
            });
    });

    it('a unhandled platform type should throw an error', async () => {
        await lambda.handler(__test_data__.wrong_platform_event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Received unsupported platform not_supported');
        });
    });

    it('should call putRecords and not the batch api', async () => {
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(__test_data__.event_no_entity_keyphrase)).to.be.undefined;
    });

    it('should call putRecords and not the batch api for image analysis', async () => {
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(__test_data__.event_no_entity_keyphrase_in_img)).to.be.undefined;
    });

    it('should be sucessful when the platform type is customingestion', async () => {
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(__transcribe_test_data__.event_transcribed_data)).to.be.undefined;
    });

    afterEach(() => {
        lambdaSpy.restore();
        delete process.env.TEXT_ANALYSIS_NS;
        delete process.env.SENTIMENT_FIREHOSE;
        delete process.env.ENTITIES_FIREHOSE;
        delete process.env.KEYPHRASE_FIREHOSE;
        delete process.env.MODERATION_LABELS_FIREHOSE;
        delete process.env.TW_FEED_STORAGE;
        delete process.env.TXT_IN_IMG_SENTIMENT_FIREHOSE;
        delete process.env.TXT_IN_IMG_ENTITY_FIREHOSE;
        delete process.env.TXT_IN_IMG_KEYPHRASE_FIREHOSE;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.CUSTOMINGESTIONITEM_FEED_STORAGE;
        delete process.env.CUSTOMINGESTIONLOUDNESS_FEED_STORAGE;
        delete process.env.CUSTOMINGESTION_FEED_STORAGE;

        AWSMock.restore('Firehose');
    });
});
