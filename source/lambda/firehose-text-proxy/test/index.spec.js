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
const AWSMock = require('aws-sdk-mock');
const moment = require('moment');
const assert = require('assert');

const __test_data__ = require('./event-test-data');

describe ('When firehose-text-proxy processor is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        lambdaSpy = sinon.spy(lambda, 'handler');

        process.env.TEXT_ANALYSIS_NS = 'com.analyze.text.inference'
        process.env.SENTIMENT_FIREHOSE = 'sentiment_stream';
        process.env.ENTITIES_FIREHOSE = 'entity_stream';
        process.env.KEYPHRASE_FIREHOSE = 'keyphrase_stream';
        process.env.MODERATION_LABELS_FIREHOSE = 'moderation_label_fireshose';


        process.env.REGION = 'us-east-1';

        AWSMock.mock('Firehose', 'putRecord', (error, callback) => {
            callback(null, {
                "Encrypted": true,
                "RecordId": "49607933892580429045866716038015163261214518926441971714"
             });
        });

        AWSMock.mock('Firehose', 'putRecordBatch', (error, callback) => {
            callback(null, {
                "Encrypted": true,
                "FailedPutCount": 0,
             });
        });
    });

    it ('should receive eventbridge event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(__test_data__.event)).to.be.undefined;
    });

    it ('should convert to unix timestamp', async () => {
        const created_at = moment.utc('Sat Jun 13 17:07:39 +0000 2020', 'ddd MMM DD HH:mm:ss Z YYYY').format('YYYY-MM-DD HH:mm:ss.SSS');
        expect(created_at).to.equal('2020-06-13 17:07:39.000');
    });

    it ('should throw an error', async() => {
        lambda.handler({
            source: 'abc',
            detail: 'meant for failure'
        }).catch ((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(error.message, 'Event source not supported');
        });
    });

    afterEach(() => {
        lambdaSpy.restore();
        delete process.env.TEXT_ANALYSIS_NS;
        delete process.env.SENTIMENT_FIREHOSE;
        delete process.env.ENTITIES_FIREHOSE;
        delete process.env.KEYPHRASE_FIREHOSE;
        delete process.env.MODERATION_LABELS_FIREHOSE;

        AWSMock.restore('Firehose');
    });
});