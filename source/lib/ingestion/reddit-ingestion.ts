#!/usr/bin/env node
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

import * as ddb from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import * as targets from '@aws-cdk/aws-events-targets';
import * as cdk from '@aws-cdk/core';
import { DiscoveringHotTopicsStack } from '../discovering-hot-topics-stack';
import { DataIngestionTemplate } from './data-ingestion-template';

export class RedditIngestion extends cdk.NestedStack {
    readonly reddit_namespace: string = 'com.analyze.reddit.subreddit';

    constructor(scope: cdk.Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        const _redditAPIKey = new cdk.CfnParameter(this, 'RedditAPIKey', {
            type: 'String',
            description:
                'Required: The SSM parameter key name where the Reddit API credentials detailare stored. For ' +
                'details about how and where to store the API credentials, please refer the implementation guide for this solution',
            default: '/discovering-hot-topics-using-machine-learning/reddit/comments',
            constraintDescription: 'Please provide the SSM key for Reddit API'
        });

        const _eventBusArn = new cdk.CfnParameter(this, 'EventBus', {
            type: 'String',
            description: 'Required: The ARN of the Event Bus messaging backbone',
            allowedPattern: '^arn:\\S+:events:\\S+:\\d{12}:event-bus/\\S+$',
            constraintDescription: 'Please provide the ARN of the Event Bus messaging backbone'
        });

        const _streamArn = new cdk.CfnParameter(this, 'StreamARN', {
            type: 'String',
            description: 'Required: The name of the stream where search comments should be published for analysis',
            allowedPattern: '^arn:\\S+:kinesis:\\S+:\\d{12}:stream/\\S+$',
            constraintDescription: 'Please provide the Amazon Kinesis Data Streams name'
        });

        const _subRedditIngestionFreq = new cdk.CfnParameter(this, 'RedditIngestionFrequency', {
            type: 'String',
            description:
                'Required: The Polling frequency at which the system should ingestion comments from subreddits',
            default: 'cron(0/60 * * * ? *)',
            allowedPattern: `${DiscoveringHotTopicsStack.cronRegex}`
        });

        const _subRedditsToFollow = new cdk.CfnParameter(this, 'SubRedditsToFollow', {
            type: 'String',
            description:
                'Optional: Please provide the list of SubReddits to follow as comma separated list. Alternatively you ' +
                'can also set the list in the DynamoDB table. For details on the DynamoDB configuration, please refer our implementation guide',
            constraintDescription: '',
            allowedPattern: '[r\\/\\w+]+([,r\\/\\w+])*',
            default: 'r/aws,r/MachineLearning'
        });

        const _stream = kinesis.Stream.fromStreamArn(this, 'PublishCommentsStream', _streamArn.valueAsString);
        const _eventBus = events.EventBus.fromEventBusArn(this, 'Bus', _eventBusArn.valueAsString) as events.EventBus;
        const _solution_id = this.node.tryGetContext('solution_id');
        const _solution_version = this.node.tryGetContext('solution_version');

        const _redditDataIngestion = new DataIngestionTemplate(this, 'SubReddit', {
            source: {
                lambdaFunctionProps: {
                    description: 'Lambda function to publish the subreddits to ingest information from',
                    handler: 'publish-subreddit.handler',
                    code: lambda.Code.fromAsset('lambda/ingestion-reddit'),
                    runtime: lambda.Runtime.NODEJS_14_X,
                    environment: {
                        SUBREDDITS_TO_FOLLOW: _subRedditsToFollow.valueAsString,
                        SUBREDDIT_PUBLISH_NAMESPACE: this.reddit_namespace
                    },
                    timeout: cdk.Duration.minutes(15)
                },
                tableProps: {
                    partitionKey: {
                        name: 'SUB_REDDIT',
                        type: ddb.AttributeType.STRING
                    }
                }
            },
            target: {
                lambdaFunctionProps: {
                    description: 'Lambda function to ingest comments from subreddits of interest',
                    handler: 'subreddit-comment.handler',
                    code: lambda.Code.fromAsset('lambda/ingestion-reddit'),
                    runtime: lambda.Runtime.NODEJS_14_X,
                    environment: {
                        REDDIT_API_KEY: _redditAPIKey.valueAsString,
                        SOLUTION_VERSION: _solution_version,
                        SOLUTION_ID: _solution_id,
                        STACK_NAME: cdk.Aws.STACK_NAME,
                        STREAM_NAME: _stream.streamName
                    },
                    timeout: cdk.Duration.minutes(15),
                    reservedConcurrentExecutions: 1 // setting to 1 to have control on API throttling from Reddit
                },
                tableProps: {
                    partitionKey: {
                        name: 'SUB_REDDIT',
                        type: ddb.AttributeType.STRING
                    }
                },
                credentialKeyPath: _redditAPIKey.valueAsString
            },
            ingestionEventRuleProps: {
                eventPattern: {
                    account: [cdk.Aws.ACCOUNT_ID],
                    region: [cdk.Aws.REGION],
                    source: [this.reddit_namespace]
                }
            },
            existingIngestionEventBus: _eventBus
        });
        _stream.grantWrite(_redditDataIngestion.targetLambda);

        const rule = new events.Rule(this, 'PollFrequency', {
            schedule: events.Schedule.expression(_subRedditIngestionFreq.valueAsString)
        });

        rule.addTarget(new targets.LambdaFunction(_redditDataIngestion.sourceLambda));
    }
}
