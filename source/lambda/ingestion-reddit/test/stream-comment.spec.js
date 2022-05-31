/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

const AWSMock = require('aws-sdk-mock');
const sinon = require('sinon');
const expect = require('chai').expect;
const StreamComment = require('../stream-comment');

describe('When publishing records to Data Streams', () => {
    const stub = sinon.stub();

    beforeEach(() => {
        process.env.STREAM_NAME = 'testStream';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        stub.returns({
            EncryptionType: 'KMS',
            FailedRecordCount: 0,
            Records: []
        });

        AWSMock.mock('Kinesis', 'putRecords', (params, callback) => {
            callback(null, stub());
        });
    });

    describe('When there are less 10 records', () => {
        beforeEach(() => {
            StreamComment.records = [];
            [...Array(5).keys()]
                .map((index) => index + 1)
                .map(async (number) => {
                    await StreamComment.publishComment({
                        name: `t_fakename_${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371'
                    });
                });
        });

        it('should not publish records if less than 10', async () => {
            expect(stub.callCount).to.equals(0);
        });

        it('should publish records even if less than 10, since flush is true', async () => {
            await StreamComment.publishComment(
                {
                    name: `t_fakename_6`,
                    body: `Some fake body 6`,
                    created_utc: '1651290371'
                },
                true
            );
            expect(stub.callCount).to.equals(1);
        });

        afterEach(() => {
            StreamComment.records = [];
            stub.reset();
        });
    });

    describe('When there are 10 or more than 10 records', () => {
        it('should publish records once', () => {
            [...Array(10).keys()]
                .map((index) => index + 1)
                .map(async (number) => {
                    await StreamComment.publishComment({
                        name: `t_fakename_${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371'
                    });
                });
            expect(stub.callCount).to.equals(1);
        });

        it('should publish records twice since flush is true', async () => {
            [...Array(10).keys()]
                .map((index) => index + 1)
                .map(async (number) => {
                    StreamComment.publishComment({
                        name: `t_fakename_${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371'
                    });
                });
            await StreamComment.publishComment(
                {
                    name: 't_fakename_11',
                    body: 'Some fake body 11',
                    created_utc: '1651290371'
                },
                true
            );
            expect(stub.callCount).to.equals(2);
        });

        afterEach(() => {
            stub.reset();
        });
    });

    afterEach(() => {
        delete process.env.STREAM_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;

        AWSMock.restore('Kinesis');
        stub.reset();
        sinon.restore();
    });
});

describe('When publishing records to Kinesis Data Stream fails', () => {
    beforeEach(() => {
        process.env.STREAM_NAME = 'testStream';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        AWSMock.mock('Kinesis', 'putRecords', (params, callback) => {
            callback(new Error('Fake Kinesis Data Streams error'), null);
        });
    });

    it('should throw an error', async () => {
        try {
            await StreamComment.publishComment({
                name: 't_fakename',
                body: 'Some fake body',
                created_utc: '1651290371'
            });
        } catch (error) {
            expect(error.message).to.equals('Fake Kinesis Data Streams error');
        }
    });

    afterEach(() => {
        delete process.env.STREAM_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;

        AWSMock.restore('Kinesis');
    });
});
