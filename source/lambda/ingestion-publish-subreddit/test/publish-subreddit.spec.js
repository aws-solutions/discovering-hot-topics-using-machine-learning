/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const AWSMock = require('aws-sdk-client-mock');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const eventBridgeMock = AWSMock.mockClient(EventBridgeClient);
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBMock = AWSMock.mockClient(DynamoDBClient);
const expect = require('chai').expect;
const PublishReddit = require('../publish-subreddit');

describe('When retrieving list of subreddits from DDB', () => {
    beforeEach(() => {
        dynamoDBMock.reset();
        eventBridgeMock.reset();
        process.env.SOURCE_DDB_TABLE = 'test_table';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.READ_SUBREDDITS_FROM_DDB = 'TRUE';

        dynamoDBMock.on(ScanCommand).resolves({
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

    it('should return list from DDB', async () => {
        const subbreddits = await PublishReddit.getSubRedditList();
        expect(subbreddits.length).to.equal(3);
        subbreddits.forEach((subreddit, index) => {
            expect(subreddit).to.equal(`r/fake${index + 1}`);
        });
    });

    it('should fail if dynamodb returns an error', async () => {
        dynamoDBMock.on(ScanCommand).callsFake((error) => {
            throw new Error('Fake DDB error');
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

        dynamoDBMock.reset();
    });
});

describe('When retrieving list of subreddits from Lambda env', () => {
    beforeEach(() => {
        dynamoDBMock.reset();
        eventBridgeMock.reset();
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
            dynamoDBMock.reset();
            eventBridgeMock.reset();
            process.env.EVENT_BUS_NAME = 'testBus';
            process.env.SUBREDDIT_PUBLISH_NAMESPACE = 'com.test.namespace';
            process.env.AWS_REGION = 'us-east-1';
            process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
            process.env.SOURCE_DDB_TABLE = 'testTable';
            process.env.SUBREDDITS_TO_FOLLOW = [...Array(3).keys()]
                .map((index) => index + 1)
                .map((number) => `r/fake${number}`)
                .join(',');

            dynamoDBMock.on(ScanCommand).resolves({
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

            eventBridgeMock.on(PutEventsCommand).resolves({
                'FailedEntryCount': 0,
                'Entries': [
                    {
                        'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                    }
                ]
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

            dynamoDBMock.restore();
            eventBridgeMock.restore();
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
        eventBridgeMock.reset();
        dynamoDBMock.reset();
        process.env.EVENT_BUS_NAME = 'testBus';
        process.env.AWS_REGION = 'us-east-1';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
    });

    it('should publish successfuly', async () => {
        eventBridgeMock.on(PutEventsCommand).callsFake((params) => {
            expect(JSON.parse(params.Entries[0].Detail)).not.Throw;
            return {
                'FailedEntryCount': 0,
                'Entries': [
                    {
                        'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                    }
                ]
            };
        });

        const subreddits = [...Array(3).keys()].map((index) => index + 1).map((number) => `r/fake${number}`);
        expect(await PublishReddit.publishSubReddits(subreddits)).to.be.undefined;
    });

    it('should contain fail count', async () => {
        eventBridgeMock.on(PutEventsCommand).resolves({
            'FailedEntryCount': 1,
            'Entries': [
                {
                    'EventId': '94f34661-daf9-a944-9b4a-787653358a74'
                }
            ]
        });
        const subreddits = [...Array(3).keys()].map((index) => index + 1).map((number) => `r/fake${number}`);
        expect(await PublishReddit.publishSubReddits(subreddits)).to.be.undefined;
    });

    afterEach(() => {
        delete process.env.EVENT_BUS_NAME;
        delete process.env.AWS_REGION;
        delete process.env.AWS_SDK_USER_AGENT;

        eventBridgeMock.restore();
    });
});
