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
const expect = require('chai').expect;
const getCommentsTracker = require('../comments-tracker');

describe('When retrieveing comment tracker', () => {
    beforeEach(() => {
        process.env.TARGET_DDB_TABLE = 'testTable';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
    });

    it('should return a value if one exists', async () => {
        AWSMock.mock('DynamoDB', 'query', (error, callback) => {
            callback(null, {
                Items: [
                    {
                        SUB_REDDIT: {
                            S: 'fake_1'
                        },
                        before: {
                            S: 't_fake_1'
                        }
                    }
                ]
            });
        });

        expect(await getCommentsTracker.getCommentsTracker('fake_1')).to.equals('t_fake_1');
    });

    it('should return 0 if table is empty', async () => {
        AWSMock.mock('DynamoDB', 'query', (error, callback) => {
            callback(null, {
                Items: []
            });
        });

        expect(await getCommentsTracker.getCommentsTracker('fakeSubRedditt')).to.equals('0');
    });

    it('should throw an error if DDB fails', async () => {
        AWSMock.mock('DynamoDB', 'query', (error, callback) => {
            callback(new Error('Fake DDB error'), null);
        });
        try {
            await getCommentsTracker.getCommentsTracker('fakeSubReddiit');
        } catch (error) {
            expect(error.message).to.equals('Fake DDB error');
        }
    });

    afterEach(() => {
        AWSMock.restore('DynamoDB');

        delete process.env.TARGET_DDB_TABLE;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});

describe('When updating comments tracker', () => {
    beforeEach(() => {
        process.env.TARGET_DDB_TABLE = 'testTable';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
    });

    it('should update tracker with the new before value', async () => {
        const subreddit = 'fakeName';
        const before = 't_fakebefore';

        AWSMock.mock('DynamoDB', 'putItem', (params, callback) => {
            console.debug(`Parameters received: ${params}`);
            expect(JSON.stringify(params.Item)).to.equals(
                JSON.stringify({
                    SUB_REDDIT: { S: subreddit },
                    before: { S: before }
                })
            );
            callback(null, {
                Attributes: {
                    string: {
                        S: params.Item.SUB_REDDIT.S,
                        S: params.Item.before.S
                    }
                }
            });
        });

        expect(await getCommentsTracker.updateCommentsTracker(subreddit, before)).to.be.undefined;
    });

    afterEach(() => {
        AWSMock.restore('DynamoDB');

        delete process.env.TARGET_DDB_TABLE;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
