#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { DiscoveringHotTopicsStack } from '../discovering-hot-topics-stack';
import { DataIngestionTemplate } from './data-ingestion-template';

export class YoutubeComments extends cdk.NestedStack {
    readonly video_namespace:string = "com.analyze.youtube.video";
    // readonly comment_namespace:string = "com.analyze.youtube.comment";

    constructor(scope: cdk.Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        const _youtubeAPIKey = new cdk.CfnParameter(this, 'YoutubeAPIKey', {
            type: 'String',
            description: 'Required: The SSM parameter key name where Youtube API credentails are stored',
            allowedPattern: '^(?!\\s*$).+',
            default: '/discovering-hot-topics-using-machine-learning/youtube/comments',
            constraintDescription: 'Please provide the SSM Key for Youtube API'
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
            constraintDescription: 'Please provide the Kinesis Stream name'
        });

        const _youtubeSearchQuery = new cdk.CfnParameter(this, 'YoutubeSearchQuery', {
            type: 'String',
            description: 'Optional search parameter to specify keywords to search for on Youtube. You can use NOT (-) and OR (|) operators to find videos. '+
            'Example \'boating|sailing -fishing\'. For details refer API documentation on this link https://developers.google.com/youtube/v3/docs/search/list. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            constraintDescription: 'Please provide key words for Youtube search query',
            minLength: 0,
            maxLength: 500
        });

        const _youtubeChannel = new cdk.CfnParameter(this, 'YouTubeChannel', {
            type: 'String',
            description: 'Optional parameter to retrieve comments data from videos from a specific channel. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            allowedPattern: '^$|^(?!\\s*$).+',
            constraintDescription: 'Please provide a valid YouTube Channel ID'
        });

        const _youtubeVideoSearchFreq = new cdk.CfnParameter(this, 'YouTubeSearchIngestionFreq', {
            type: 'String',
            default: 'cron(0 12 * * ? *)',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            description: 'Required: The frequency at which at which YouTube comments should be retrieved',
            constraintDescription: 'Please provide a valid cron expression of the formation \'cron(0 12 * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _videoSearchIngestionWindow = new cdk.CfnParameter(this, 'YouTubeSearchWindow', {
            type: 'Number',
            default: 7,
            minValue: 1,
            maxValue: 30,
            description: 'Required: Please provide the window in "Days" (between 1 to 30) for videos to look for. This is used to filter out videos older than the specified window',
            constraintDescription: 'The search window range can only be from 1 to 30 days (both inclusive). Please provide a valid range.'
        });

        new cdk.CfnRule(this, '"YouTubeSearchQueryIsNull"', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeSearchQuery.logicalId), ""),
            assertions: [{
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeChannel.logicalId), "")),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "Yes" then atleast one parameter from "YouTubeVideoSearchQuery" and "YouTubeChannel" should be provided. Both cannot be blank'
            }]
        });

        new cdk.CfnRule(this, '"YouTubeChannelIsNull"', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeChannel.logicalId), ""),
            assertions: [{
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeSearchQuery.logicalId), "")),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "Yes" then atleast one parameter from "YouTubeVideoSearchQuery" and "YouTubeChannel" should be provided. Both cannot be blank'
            }]
        });

        const _stream = kinesis.Stream.fromStreamArn(this, 'PublishCommentsStream', _streamArn.valueAsString);
        const _eventBus = events.EventBus.fromEventBusArn(this, 'Bus', _eventBusArn.valueAsString) as events.EventBus;

        const _youTubeDataIngestion = new DataIngestionTemplate(this, 'SearchVideo', {
            source: {
                lambdaFunctionProps: {
                    description: 'This lambda function searches for the videos',
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.search_videos',
                    code: lambda.Code.fromAsset('lambda/ingestion-youtube'),
                    environment: {
                        VIDEO_NAMESPACE: this.video_namespace,
                        SSM_API_KEY: _youtubeAPIKey.valueAsString,
                        QUERY: _youtubeSearchQuery.valueAsString,
                        CHANNEL_ID: _youtubeChannel.valueAsString,
                        VIDEO_SEARCH_INGESTION_WINDOW: cdk.Token.asString(_videoSearchIngestionWindow.valueAsNumber),
                    },
                    timeout: cdk.Duration.minutes(15),
                    memorySize: 256
                }
            },
            target: {
                lambdaFunctionProps: {
                    description: 'This lambda function searches for the comments associates with the videos',
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.search_comments',
                    code: lambda.Code.fromAsset('lambda/ingestion-youtube'),
                    environment: {
                        STREAM_NAME: _stream.streamName,
                        SSM_API_KEY: _youtubeAPIKey.valueAsString,
                        VIDEO_NAMESPACE: this.video_namespace,
                        CHANNEL_ID: _youtubeChannel.valueAsString,
                        VIDEO_SEARCH_INGESTION_WINDOW: cdk.Token.asString(_videoSearchIngestionWindow.valueAsNumber)
                    },
                    timeout: cdk.Duration.minutes(10),
                    memorySize: 256
                },
                tableProps: {
                    partitionKey: {
                        name: 'VIDEO_ID',
                        type: ddb.AttributeType.STRING
                    },
                    timeToLiveAttribute: "EXP_DATE"
                }
            },
            ingestionEventRuleProps: {
                eventPattern: {
                    account: [ cdk.Aws.ACCOUNT_ID ],
                    region: [ cdk.Aws.REGION ],
                    source: [ this.video_namespace ]
                }
            },
            existingIngestionEventBus: _eventBus
        });

        _youTubeDataIngestion.sourceLambda.role?.attachInlinePolicy(new iam.Policy(this, 'SourceFnSSMPolicy', { // NOSONAR - typescript:S905. Sonarqube misinterprets the "?" operator
            statements: [ new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [ 'ssm:GetParameter' ],
                resources: [ `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${_youtubeAPIKey.valueAsString}` ]
            })]
        }));

        _youTubeDataIngestion.targetLambda.role?.attachInlinePolicy(new iam.Policy(this, 'TargetFnSSMPolicy', { // NOSONAR - typescript:S905. Sonarqube misinterprets the "?" operator
            statements: [ new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [ 'ssm:GetParameter' ],
                resources: [ `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${_youtubeAPIKey.valueAsString}` ]
            })]
        }));

        _stream.grantWrite(_youTubeDataIngestion.targetLambda);

        const rule = new events.Rule(this, 'PollFrequency', {
            schedule: events.Schedule.expression(_youtubeVideoSearchFreq.valueAsString)
        });

        rule.addTarget(new targets.LambdaFunction(_youTubeDataIngestion.sourceLambda));
    }
}