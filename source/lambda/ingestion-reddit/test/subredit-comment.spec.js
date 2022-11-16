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

const snoowrap = require('snoowrap');
const AWSMock = require('aws-sdk-mock');
const expect = require('chai').expect;
const SubRedditComment = require('../subreddit-comment');

describe('When checking environment variables', () => {
    it('should be successful when values are set', () => {
        process.env.TARGET_DDB_TABLE = 'testTable';
        process.env.REDDIT_API_KEY = '/fake/key/path';
        process.env.SOLUTION_VERSION = '0.0.0';
        process.env.STACK_NAME = 'testStack';
        process.env.SOLUTION_ID = 'fakeID';
        process.env.STREAM_NAME = 'fakeStream';

        expect(SubRedditComment.checkEnvSetup()).to.be.undefined;
    });

    it('should throw an error when values are not set', () => {
        try {
            SubRedditComment.checkEnvSetup();
        } catch (error) {
            expect(error.message).to.equals(
                'Some or all of environment variables not set. Please check if "TARGET_DDB_TABLE", "REDDIT_API_KEY", "STREAM_NAME", "SOLUTION_VERSION", "STACK_NAME" and "SOLUTION_ID" variables are set with appropriate values'
            );
        }
    });

    afterEach(() => {
        delete process.env.TARGET_DDB_TABLE;
        delete process.env.REDDIT_API_KEY;
        delete process.env.SOLUTION_VERSION;
        delete process.env.STACK_NAME;
        delete process.env.SOLUTION_ID;
        delete process.env.STREAM_NAME;
    });
});

describe('When retrieving API credentials', () => {
    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.REDDIT_API_KEY = '/fake/key/path';
        process.env.SOLUTION_VERSION = '0.0.0';
        process.env.STACK_NAME = 'testStack';
        process.env.SOLUTION_ID = 'fakeID';
        process.env.STREAM_NAME = 'fakeStream';
    });

    it('should be successful if parameter value is available', async () => {
        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            expect(params.Name).to.equals(process.env.REDDIT_API_KEY);
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "clientSecret":"fakeSecret", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });

        const output = await SubRedditComment.getRedditAPICredentials();
        expect(output.clientId).to.equals('fakeclientId');
        expect(output.clientSecret).to.equals('fakeSecret');
        expect(output.refreshToken).to.equals('fakeRefreshToken');
        expect(output.userAgent).to.equals(
            `${process.env.STACK_NAME}:${process.env.SOLUTION_ID}:${process.env.SOLUTION_VERSION} (by /u/user)`
        );
    });

    it('should throw an error if parameter is not available', async () => {
        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            callback(new Error('Parameter not found'), null);
        });

        try {
            await SubRedditComment.getRedditAPICredentials();
        } catch (error) {
            expect(error.message).to.equals('Parameter not found');
        }
    });

    it('should throw an error if all parameters are not in the JSON string', async () => {
        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            callback(null, {
                Parameter: {
                    Value: '{"clientSecret":"fakeSecret", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });
        try {
            await SubRedditComment.getRedditAPICredentials();
        } catch (error) {
            expect(error.message).to.equals(
                'Either "clientId" or "clientSecret" or "refreshToken" is missing in the JSON string retrieved from Parameter Store'
            );
        }

        AWSMock.remock('SSM', 'getParameter', (params, callback) => {
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });

        try {
            await SubRedditComment.getRedditAPICredentials();
        } catch (error) {
            expect(error.message).to.equals(
                'Either "clientId" or "clientSecret" or "refreshToken" is missing in the JSON string retrieved from Parameter Store'
            );
        }

        AWSMock.remock('SSM', 'getParameter', (params, callback) => {
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "clientSecret":"fakeSecret"}'
                }
            });
        });

        try {
            await SubRedditComment.getRedditAPICredentials();
        } catch (error) {
            expect(error.message).to.equals(
                'Either "clientId" or "clientSecret" or "refreshToken" is missing in the JSON string retrieved from Parameter Store'
            );
        }
    });

    afterEach(() => {
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.REDDIT_API_KEY;
        delete process.env.SOLUTION_VERSION;
        delete process.env.STACK_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SOLUTION_ID;

        AWSMock.restore('SSM');
    });
});

describe('When mocking reddit', () => {
    let snoowrapSpy;

    it('should call the mock implementation', async () => {
        const r = new snoowrap({
            clientId: 'fakeclientId',
            clientSecret: 'fakeSecret',
            refreshToken: 'fakeRefreshToken',
            userAgent: 'fakeAgent'
        });

        snoowrapSpy = jest.spyOn(r, 'getNewComments').mockImplementation((subreddit, before) => {
            return [...Array(10).keys()]
                .map((index) => index + 1)
                .map((number) => {
                    return {
                        subreddit_id: `t5_fake${number}`,
                        link_title: `fake title ${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371',
                        expandReplies: () => {
                            [...Array(10).keys()]
                                .map((index) => index + 1)
                                .map((number) => {
                                    return {
                                        subreddit_id: `t5_fake${number}`,
                                        link_title: `fake title ${number}`,
                                        body: `Some fake body ${number}`,
                                        created_utc: '1651290371'
                                    };
                                });
                        }
                    };
                });
        });

        await r.getNewComments('fakeId');
        expect(r.getNewComments.mock.calls.length).to.equals(1);
    });

    afterEach(() => {
        snoowrapSpy.mockRestore();
    });
});

describe('When calling Reddit API', () => {
    let snoowrapSpy;

    const r = new snoowrap({
        clientId: 'fakeclientId',
        clientSecret: 'fakeSecret',
        refreshToken: 'fakeRefreshToken',
        userAgent: 'fakeAgent'
    });

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.REDDIT_API_KEY = '/fake/key/path';
        process.env.SOLUTION_VERSION = '0.0.0';
        process.env.STACK_NAME = 'testStack';
        process.env.SOLUTION_ID = 'fakeID';
        process.env.STREAM_NAME = 'fakeStream';
        process.env.TARGET_DDB_TABLE = 'testTable';

        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            expect(params.Name).to.equals(process.env.REDDIT_API_KEY);
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "clientSecret":"fakeSecret", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });

        AWSMock.mock('Kinesis', 'putRecords', (params, callback) => {
            callback(null, {
                EncryptionType: 'KMS',
                FailedRecordCount: 0,
                Records: []
            });
        });

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

        AWSMock.mock('DynamoDB', 'putItem', (params, callback) => {
            callback(null, {
                Attributes: {
                    string: {
                        S: params.Item.SUB_REDDIT.S,
                        S: params.Item.before.S
                    }
                }
            });
        });
    });

    it('should retrieve reddit comments and publish it on Data Streams', async () => {
        snoowrapSpy = jest.spyOn(r, 'getNewComments');
        snoowrapSpy.mockImplementation((subreddit, before) => {
            expect(subreddit).to.equals('fakeSubreddit');
            return [...Array(10).keys()]
                .map((index) => index + 1)
                .map((number) => {
                    return {
                        subreddit_id: `t5_fake${number}`,
                        link_title: `fake title ${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371',
                        name: `t1_fakename${number}`,
                        replies: {
                            fetchMore: () => {
                                return [...Array(10).keys()]
                                    .map((index) => index + 1)
                                    .map((number) => {
                                        return {
                                            subreddit_id: `t5_fake${number}`,
                                            link_title: `fake title ${number}`,
                                            body: `Some fake body ${number}`,
                                            created_utc: '1651290371',
                                            name: `t1_fakename${number}`,
                                            replies: {
                                                fetchMore: () => {
                                                    return [];
                                                }
                                            }
                                        };
                                    });
                            }
                        }
                    };
                });
        });

        await r.getNewComments('fakeSubreddit');
        expect(r.getNewComments.mock.calls.length).to.equals(1);

        jest.spyOn(SubRedditComment, 'getRedditAPI').mockImplementation(() => {
            return r;
        });

        const mockContext = {
            getRemainingTimeInMillis: () => {
                return 10000;
            }
        };
        jest.spyOn(mockContext, 'getRemainingTimeInMillis')
            .mockReturnValue(3000)
            .mockReturnValueOnce(8000)
            .mockReturnValueOnce(6000);

        expect(await SubRedditComment.getComments('r/fakeSubreddit', mockContext)).to.be.undefined;
        expect(r.getNewComments.mock.calls.length).to.equals(2);
        expect(mockContext.getRemainingTimeInMillis.mock.calls.length).to.equals(4);
    });

    it('should terminate when no comments are found', async () => {
        snoowrapSpy = jest.spyOn(r, 'getNewComments');
        snoowrapSpy.mockImplementation((subreddit, before) => {
            return [];
        });

        expect(await SubRedditComment.getComments('fakeSubreddit', {})).to.be.undefined;
        expect(r.getNewComments.mock.calls.length).to.equals(1);
    });

    afterEach(() => {
        snoowrapSpy.mockRestore();

        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.REDDIT_API_KEY;
        delete process.env.SOLUTION_VERSION;
        delete process.env.STACK_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SOLUTION_ID;

        AWSMock.restore('SSM');
        AWSMock.restore('Kinesis');
        AWSMock.restore('DynamoDB');
    });
});

describe('When initializing Reddit API', () => {
    beforeEach(() => {
        process.env.AWS_REGION;
        process.env.AWS_SDK_USER_AGENT;
        process.env.REDDIT_API_KEY;

        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            expect(params.Name).to.equals(process.env.REDDIT_API_KEY);
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "clientSecret":"fakeSecret", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });
    });

    it('should return instance of snoowrap', async () => {
        expect((await SubRedditComment.getRedditAPI()) instanceof snoowrap).to.be.true;
    });

    afterEach(() => {
        delete process.env.REDDIT_API_KEY;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;

        AWSMock.restore('SSM');
    });
});

describe('When calling Reddit API', () => {
    let snoowrapSpy;

    const r = new snoowrap({
        clientId: 'fakeclientId',
        clientSecret: 'fakeSecret',
        refreshToken: 'fakeRefreshToken',
        userAgent: 'fakeAgent'
    });

    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.REDDIT_API_KEY = '/fake/key/path';
        process.env.SOLUTION_VERSION = '0.0.0';
        process.env.STACK_NAME = 'testStack';
        process.env.SOLUTION_ID = 'fakeID';
        process.env.STREAM_NAME = 'fakeStream';
        process.env.TARGET_DDB_TABLE = 'testTable';
        process.env.STREAM_NAME = 'testStream';

        AWSMock.mock('SSM', 'getParameter', (params, callback) => {
            expect(params.Name).to.equals(process.env.REDDIT_API_KEY);
            callback(null, {
                Parameter: {
                    Value: '{"clientId":"fakeclientId", "clientSecret":"fakeSecret", "refreshToken":"fakeRefreshToken"}'
                }
            });
        });

        AWSMock.mock('Kinesis', 'putRecords', (params, callback) => {
            callback(null, {
                EncryptionType: 'KMS',
                FailedRecordCount: 0,
                Records: []
            });
        });

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

        AWSMock.mock('DynamoDB', 'putItem', (params, callback) => {
            callback(null, {
                Attributes: {
                    string: {
                        S: params.Item.SUB_REDDIT.S,
                        S: params.Item.before.S
                    }
                }
            });
        });
    });

    it('should invoke lambda', async () => {
        snoowrapSpy = jest.spyOn(r, 'getNewComments');
        snoowrapSpy.mockImplementation((subreddit, before) => {
            expect(subreddit).to.equals('fakeSubreddit');
            return [...Array(10).keys()]
                .map((index) => index + 1)
                .map((number) => {
                    return {
                        subreddit_id: `t5_fake${number}`,
                        link_title: `fake title ${number}`,
                        body: `Some fake body ${number}`,
                        created_utc: '1651290371',
                        name: `t1_fakename${number}`,
                        replies: {
                            fetchMore: () => {
                                return [...Array(10).keys()]
                                    .map((index) => index + 1)
                                    .map((number) => {
                                        return {
                                            subreddit_id: `t6_fake${number}`,
                                            link_title: `fake reply ${number}`,
                                            body: `Some fake reply body ${number}`,
                                            created_utc: '1651290371',
                                            name: `t1_fakename${number}`,
                                            replies: {
                                                fetchMore: () => {
                                                    return [];
                                                }
                                            }
                                        };
                                    });
                            }
                        }
                    };
                });
        });

        await r.getNewComments('fakeSubreddit');
        expect(r.getNewComments.mock.calls.length).to.equals(1);

        jest.spyOn(SubRedditComment, 'getRedditAPI').mockImplementation(() => {
            return r;
        });

        const mockContext = {
            getRemainingTimeInMillis: () => {
                return 10000;
            }
        };
        jest.spyOn(mockContext, 'getRemainingTimeInMillis')
            .mockReturnValue(3000)
            .mockReturnValueOnce(8000)
            .mockReturnValueOnce(6000);

        expect(await SubRedditComment.handler({ detail: { name: 'r/fakeSubreddit', type: 'reddit' } }, mockContext)).to
            .be.undefined;
        expect(r.getNewComments.mock.calls.length).to.equals(2);
        expect(mockContext.getRemainingTimeInMillis.mock.calls.length).to.equals(4);
    });

    afterEach(() => {
        snoowrapSpy.mockRestore();

        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.REDDIT_API_KEY;
        delete process.env.SOLUTION_VERSION;
        delete process.env.STACK_NAME;
        delete process.env.STREAM_NAME;
        delete process.env.SOLUTION_ID;
        delete process.env.STREAM_NAME;

        AWSMock.restore('SSM');
        AWSMock.restore('Kinesis');
        AWSMock.restore('DynamoDB');
    });
});

describe('When sleep duration is provided', () => {
    it('should sleep for 1 sec if provided parameter is 1000', async () => {
        const start = Date.now();
        await SubRedditComment.sleep(1000);
        const now = Date.now();
        expect(now - start).to.greaterThanOrEqual(999);
    });

    it('should sleep for 3 sec if provided parameter is 3000', async () => {
        const start = Date.now();
        await SubRedditComment.sleep(3000);
        const now = Date.now();
        expect(now - start).to.be.greaterThanOrEqual(3000);
    });
});
