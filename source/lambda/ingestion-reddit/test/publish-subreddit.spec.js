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

const AWSMock = require('aws-sdk-mock');
const expect = require('chai').expect;
const PublishReddit = require('../publish-subreddit');

describe('When retrieving list of subreddits from DDB', () => {
    beforeEach(() => {
        process.env.SOURCE_DDB_TABLE = 'test_table';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.READ_SUBREDDITS_FROM_DDB = 'TRUE';

        AWSMock.mock('DynamoDB', 'scan', (error, callback) => {
            callback(null, {
                Items: [...Array(3).keys()]
                    .map((index) => index + 1)
                    .map((number) => {
                        return {
                            SUB_REDDIT: {
                                S: `r/fake${number}`
                            }
                        };
                    })
            });
        });
    });

    it('should return list from DDB', async () => {
        const subbreddits = await PublishReddit.getSubRedditList();
        expect(subbreddits.length).to.equal(3);
        subbreddits.forEach((subreddit, index) => {
            expect(subreddit).to.equal(`r/fake${index + 1}`);
        });
    });

    it('should fail if dynamodb returns an error', async () => {
        AWSMock.remock('DynamoDB', 'scan', (error, callback) => {
            callback(new Error('Fake DDB error'), null);
        });
        try {
            await PublishReddit.getSubRedditList();
        } catch (error) {
            expect(error.message).to.equals('Fake DDB error');
        }
    });

    afterEach(() => {
        delete process.env.SOURCE_DDB_TABLE;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.READ_SUBREDDITS_FROM_DDB;

        AWSMock.restore('DynamoDB');
    });
});

describe('When retrieving list of subreddits from Lambda env', () => {
    beforeEach(() => {
        process.env.SUBREDDITS_TO_FOLLOW = [...Array(3).keys()]
            .map((index) => index + 1)
            .map((number) => `r/fake${number}`)
            .join(',');
    });

    it('should return parse list', async () => {
        const subbreddits = await PublishReddit.getSubRedditList();
        expect(subbreddits.length).to.equal(3);
        subbreddits.forEach((subreddit, index) => {
            expect(subreddit).to.equal(`r/fake${index + 1}`);
        });
    });

    afterEach(() => {
        delete process.env.SUBREDDITS_TO_FOLLOW;
    });
});

describe('When DDB and Lambda env are not set', () => {
    it('should throw an error', async () => {
        try {
            await PublishReddit.getSubRedditList();
        } catch (error) {
            expect(error.message).to.equal('Neither environment variable nor Dynamodb setup for subreddits to follow');
        }
    });
});

describe('When checking environment variables', () => {
    it('should fail if lambda env not setup', () => {
        try {
            PublishReddit.checkEnvSetup();
        } catch (error) {
            expect(error.message).to.equals(
                'Some or all of environment variables not set. Please check if "EVENT_BUS_NAME", "SUBREDDIT_PUBLISH_NAMESPACE", and  "SOURCE_DDB_TABLE" variables are set with appropriate values'
            );
        }
    });

    it('should not fail if lambda env is setup', () => {
        process.env.EVENT_BUS_NAME = 'testBus';
        process.env.SUBREDDIT_PUBLISH_NAMESPACE = 'com.test.namespace';
        process.env.SOURCE_DDB_TABLE = 'testTable';
        expect(PublishReddit.checkEnvSetup()).to.be.undefined;
    });

    afterEach(() => {
        delete process.env.EVENT_BUS_NAME;
        delete process.env.SUBREDDIT_PUBLISH_NAMESPACE;
        delete process.env.SOURCE_DDB_TABLE;
    });
});

describe('When invoking lambda', () => {
    describe('if environment variables are setup correctly', () => {
        beforeEach(() => {
            process.env.EVENT_BUS_NAME = 'testBus';
            process.env.SUBREDDIT_PUBLISH_NAMESPACE = 'com.test.namespace';
            process.env.AWS_REGION = 'us-east-1';
            process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
            process.env.SOURCE_DDB_TABLE = 'testTable';
            process.env.SUBREDDITS_TO_FOLLOW = [...Array(3).keys()]
                .map((index) => index + 1)
                .map((number) => `r/fake${number}`)
                .join(',');

            AWSMock.mock('DynamoDB', 'scan', (error, callback) => {
                callback(null, {
                    Items: [...Array(3).keys()]
                        .map((index) => index + 1)
                        .map((number) => {
                            return {
                                SUB_REDDIT: {
                                    S: `r/fake${number}`
                                }
                            };
                        })
                });
            });

            AWSMock.mock('EventBridge', 'putEvents', (error, callback) => {
                callback(null, {
                    'FailedEntryCount': 0,
                    'Entries': [
                        {
                            'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                        }
                    ]
                });
            });
        });

        it('should be successful', async () => {
            expect(await PublishReddit.handler()).to.be.undefined;
        });

        afterEach(() => {
            delete process.env.EVENT_BUS_NAME;
            delete process.env.SUBREDDIT_PUBLISH_NAMESPACE;
            delete process.env.SUBREDDITS_TO_FOLLOW;
            delete process.env.AWS_REGION;
            delete process.env.AWS_SDK_USER_AGENT;

            AWSMock.restore('DynamoDB');
            AWSMock.restore('EventBridge');
        });
    });

    describe('if environment variables not setup correctly', () => {
        it('should throw an error', async () => {
            try {
                await PublishReddit.handler();
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
        });
    });
});

describe('When publishing subreddits', () => {
    beforeEach(() => {
        process.env.EVENT_BUS_NAME = 'testBus';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
    });

    it('should publish successfuly', async () => {
        AWSMock.mock('EventBridge', 'putEvents', (params, callback) => {
            expect(JSON.parse(params.Entries[0].Detail)).not.Throw;
            callback(null, {
                'FailedEntryCount': 0,
                'Entries': [
                    {
                        'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                    }
                ]
            });
        });

        const subreddits = [...Array(3).keys()].map((index) => index + 1).map((number) => `r/fake${number}`);
        expect(await PublishReddit.publishSubReddits(subreddits)).to.be.undefined;
    });

    it('should contain fail count', async () => {
        AWSMock.mock('EventBridge', 'putEvents', (error, callback) => {
            callback(null, {
                'FailedEntryCount': 1,
                'Entries': [
                    {
                        'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                    }
                ]
            });
        });
        const subreddits = [...Array(3).keys()].map((index) => index + 1).map((number) => `r/fake${number}`);
        expect(await PublishReddit.publishSubReddits(subreddits)).to.be.undefined;
    });

    afterEach(() => {
        delete process.env.EVENT_BUS_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;

        AWSMock.restore('EventBridge');
    });
});
