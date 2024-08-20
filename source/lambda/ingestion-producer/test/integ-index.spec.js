/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

const expect = require('chai').expect;
const sinon = require('sinon');
const AWSMock = require('aws-sdk-client-mock');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const ssmMock = AWSMock.mockClient(SSMClient);
const { KinesisClient, PutRecordsCommand } = require('@aws-sdk/client-kinesis');
const kinesisMock = AWSMock.mockClient(KinesisClient);
const { DynamoDBClient, QueryCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBMock = AWSMock.mockClient(DynamoDBClient);
const Twit = require('twitter-lite');
const assert = require('assert');

const lambda = require('../index.js');

describe('Lambda Integration Test AWS SDK and Twitter API', () => {
    let twitStub;
    let lambdaSpy;
    let _headerMap = new Map();
    let regularSearch;

    beforeEach(() => {
        ssmMock.reset();
        kinesisMock.reset();
        dynamoDBMock.reset();
        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.DDB_TABLE_NAME = 'test_table';
        process.env.AWS_REGION = 'us-east-1';
        process.env.STACK_NAME = 'DiscoveringHotTopicsUsingMachineLearning';
        process.env.TWITTER_CREDENTIAL_KEY_PATH = `/${process.env.SOLUTION_NAME}/${process.env.STACK_NAME}/twitter`;
        process.env.SUPPORTED_LANG = 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw';
        process.env.STREAM_NAME = 'testStream';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        // stub AWS services
        ssmMock.on(GetParameterCommand).callsFake((params) => {
            if (
                params.Name == `/${process.env.SOLUTION_NAME}/${process.env.STACK_NAME}/twitter` &&
                params.WithDecryption
            ) {
                return {
                    'Parameter': {
                        'Name': '/discovering-hot-topics-using-machine-learning/twitter',
                        'Type': 'SecureString',
                        'Value': 'SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ',
                        'Version': 1,
                        'LastModifiedDate': 1589342370.68,
                        'ARN': 'arn:aws:ssm:us-east-1:someaccountid:parameter/somepath/twitter',
                        'DataType': 'text'
                    }
                };
            } else {
                throw new Error('Parameter does not exist');
            }
        });

        ssmMock.on(PutParameterCommand).callsFake((params) => {
            if (params.Value === 'Dummy Values') {
                return {
                    'Parameter': {
                        'Version': '1.0',
                        'Tier': 'Standard'
                    }
                };
            } else {
                throw new Error('Unit test failed');
            }
        });

        dynamoDBMock.on(QueryCommand).resolves({
            Items: [
                {
                    MAX_ID: { S: '123' }
                }
            ]
        });

        dynamoDBMock.on(PutItemCommand).resolves('Success');

        kinesisMock.on(PutRecordsCommand).resolves({
            'FailedRecordCount': 0,
            'Records': [
                {
                    'SequenceNumber': '49607379513895389733399918812709686257133734922654056450',
                    'ShardId': 'shardId-000000000000'
                },
                {
                    'SequenceNumber': '49607379513895389733399918812710895182953349551828762626',
                    'ShardId': 'shardId-000000000000'
                },
                {
                    'SequenceNumber': '49607379513895389733399918812712104108772964181003468802',
                    'ShardId': 'shardId-000000000000'
                }
            ],
            'EncryptionType': 'KMS'
        });

        lambdaSpy = sinon.spy(lambda, 'handler');

        // stub twitter API
        _headerMap.set('status', '200 OK');
        _headerMap.set('x-rate-limit-reset', Date.now() + 15 * 1000 * 60);
        _headerMap.set('x-rate-limit-limit', 450);
        _headerMap.set('x-rate-limit-remaining', 400);

        twitStub = sinon.stub(Twit.prototype, 'get');
        regularSearch = twitStub.withArgs('search/tweets', sinon.match.any).returns({
            _headers: _headerMap,
            statuses: [
                {
                    'created_at': 'Mon May 06 20:01:29 +0000 2019',
                    'id': 12345678901234567890,
                    'id_str': '12345678901234567890',
                    'text': 'This is a sample tweet',
                    'truncated': true,
                    'retweet_count': 20,
                    'favorite_count': 44,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                },
                {
                    'created_at': 'Sat May 04 15:00:33 +0000 2019',
                    'id': 12345678901234567891,
                    'id_str': '12345678901234567891',
                    'text': 'This is 2nd sample text',
                    'truncated': true,
                    'geo': null,
                    'coordinates': null,
                    'place': null,
                    'contributors': null,
                    'is_quote_status': false,
                    'retweet_count': 12,
                    'favorite_count': 27,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                }
            ],
            'search_metadata': {
                'completed_in': 0.047,
                'max_id': 98765432109876543,
                'max_id_str': '98765432109876543',
                'next_results':
                    '?max_id=98765432109876543&q=from%3Atwitterdev&count=2&include_entities=1&result_type=mixed',
                'query': 'from%3Atwitterdev',
                'refresh_url': '?since_id=98765432109876543&q=from%3Atwitterdev&result_type=mixed&include_entities=1',
                'count': 2,
                'since_id': 0,
                'since_id_str': '0'
            }
        });

        twitStub.withArgs('application/rate_limit_status', sinon.match.any).returns({
            'rate_limit_context': {
                'access_token': 'FakeAccessToken'
            },
            'resources': {
                'search': {
                    '/search/tweets': {
                        'limit': 450,
                        'remaining': 400,
                        'reset': Date.now() + 15 * 60 * 1000
                    }
                }
            }
        });
    });

    it('should make a successful API call when below limit', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
        sinon.assert.callCount(regularSearch, process.env.SUPPORTED_LANG.split(',').length);
    });

    it('should stop after making 3 api calls to search', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        twitStub.withArgs('application/rate_limit_status', sinon.match.any).returns({
            'rate_limit_context': {
                'access_token': 'FakeAccessToken'
            },
            'resources': {
                'search': {
                    '/search/tweets': {
                        'limit': 450,
                        'remaining': 3,
                        'reset': Date.now() + 15 * 60 * 1000
                    }
                }
            }
        });

        const searchCalledThrice = twitStub.withArgs('search/tweets', sinon.match.any).returns({
            _headers: _headerMap,
            statuses: [
                {
                    'created_at': 'Mon May 06 20:01:29 +0000 2019',
                    'id': 12345678901234567890,
                    'id_str': '12345678901234567890',
                    'text': 'This is a sample tweet',
                    'truncated': true,
                    'retweet_count': 20,
                    'favorite_count': 44,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                },
                {
                    'created_at': 'Sat May 04 15:00:33 +0000 2019',
                    'id': 12345678901234567891,
                    'id_str': '12345678901234567891',
                    'text': 'This is 2nd sample text',
                    'truncated': true,
                    'geo': null,
                    'coordinates': null,
                    'place': null,
                    'contributors': null,
                    'is_quote_status': false,
                    'retweet_count': 12,
                    'favorite_count': 27,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                }
            ],
            'search_metadata': {
                'completed_in': 0.047,
                'max_id': 98765432109876543,
                'max_id_str': '98765432109876543',
                'next_results':
                    '?max_id=98765432109876543&q=from%3Atwitterdev&count=2&include_entities=1&result_type=mixed',
                'query': 'from%3Atwitterdev',
                'refresh_url': '?since_id=98765432109876543&q=from%3Atwitterdev&result_type=mixed&include_entities=1',
                'count': 2,
                'since_id': 0,
                'since_id_str': '0'
            }
        });

        searchCalledThrice.resetHistory();
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
        sinon.assert.calledThrice(searchCalledThrice);
    });

    it('should call at all', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        twitStub.withArgs('application/rate_limit_status', sinon.match.any).returns({
            'rate_limit_context': {
                'access_token': 'FakeAccessToken'
            },
            'resources': {
                'search': {
                    '/search/tweets': {
                        'limit': 450,
                        'remaining': 0,
                        'reset': Date.now() + 15 * 60 * 1000
                    }
                }
            }
        });

        const noSearchCalled = twitStub.withArgs('search/tweets', sinon.match.any).returns({
            _headers: _headerMap,
            statuses: [
                {
                    'created_at': 'Mon May 06 20:01:29 +0000 2019',
                    'id': 12345678901234567890,
                    'id_str': '12345678901234567890',
                    'text': 'This is a sample tweet',
                    'truncated': true,
                    'retweet_count': 20,
                    'favorite_count': 44,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                },
                {
                    'created_at': 'Sat May 04 15:00:33 +0000 2019',
                    'id': 12345678901234567891,
                    'id_str': '12345678901234567891',
                    'text': 'This is 2nd sample text',
                    'truncated': true,
                    'geo': null,
                    'coordinates': null,
                    'place': null,
                    'contributors': null,
                    'is_quote_status': false,
                    'retweet_count': 12,
                    'favorite_count': 27,
                    'favorited': false,
                    'retweeted': false,
                    'possibly_sensitive': false,
                    'lang': 'en'
                }
            ],
            'search_metadata': {
                'completed_in': 0.047,
                'max_id': 98765432109876543,
                'max_id_str': '98765432109876543',
                'next_results':
                    '?max_id=98765432109876543&q=from%3Atwitterdev&count=2&include_entities=1&result_type=mixed',
                'query': 'from%3Atwitterdev',
                'refresh_url': '?since_id=98765432109876543&q=from%3Atwitterdev&result_type=mixed&include_entities=1',
                'count': 2,
                'since_id': 0,
                'since_id_str': '0'
            }
        });

        noSearchCalled.resetHistory();
        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
        sinon.assert.notCalled(noSearchCalled);
    });

    it('should throw an error for Twitter API failure', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        twitStub.throws('Failure', 'Fake error for Twitter testing');
        twitStub.resetHistory();

        if (!lambdaSpy.threw()) expect.fail;
        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Fake error for Twitter testing');
        });
    });

    it('should throw an error for DynamoDB Query failure', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        dynamoDBMock.on(QueryCommand).callsFake((error, callback) => {
            callback(new Error('DynamoDB fake query failure'), null);
        });

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'DynamoDB fake query failure');
        });
    });

    it('should throw an error for DynamoDB put failure', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        dynamoDBMock.on(PutItemCommand).callsFake((error, callback) => {
            callback(new Error('DynamoDB fake put failure'), null);
        });

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'DynamoDB fake put failure');
        });
    });

    it('should throw an error for Kinesis putRecords', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };
        kinesisMock.on(PutRecordsCommand).callsFake((error, callback) => {
            callback(new Error('Kinesis fake putRecords failure'), null);
        });

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Kinesis fake putRecords failure');
        });
    });

    it('should throw an error for SSM getParameter failure', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        ssmMock.on(GetParameterCommand, (error, callback) => {
            callback(new Error('Kinesis fake getParameter failure'), null);
        });

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Kinesis fake getParameter failure');
        });
    });

    it('should throw an error for SSM putParameter failure', async () => {
        const event = {
            'messageId': '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
            'receiptHandle': 'MessageReceiptHandle',
            'body': {
                account_name: 'twitter',
                platform: 'Twitter'
            },
            'attributes': {
                'ApproximateReceiveCount': '1',
                'SentTimestamp': '1523232000000',
                'SenderId': 'fakeSenderId',
                'ApproximateFirstReceiveTimestamp': '1523232000001'
            },
            'messageAttributes': {},
            'md5OfBody': '7b270e59b47ff90a553787216d55d91d',
            'source': 'aws.events',
            'awsRegion': 'us-east-1'
        };

        ssmMock.on(GetParameterCommand, (error, callback) => {
            callback(new Error('Kinesis fake putParameter failure'), null);
        });

        await lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Kinesis fake putParameter failure');
        });
    });

    afterEach(() => {
        delete process.env.SOLUTION_NAME;
        delete process.env.STACK_NAME;
        delete process.env.DDB_TABLE_NAME;
        delete process.env.AWS_REGION;
        delete process.env.TWITTER_CREDENTIAL_KEY_PATH;
        delete process.env.SUPPORTED_LANG;
        delete process.env.STREAM_NAME;
        delete process.env.AWS_SDK_USER_AGENT;

        ssmMock.restore();
        kinesisMock.restore();
        dynamoDBMock.restore();
        twitStub.restore();
        lambdaSpy.restore();
    });
});
