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

import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { DiscoveringHotTopicsStack } from '../discovering-hot-topics-stack';
import { DataIngestionTemplate } from './data-ingestion-template';

export class NewsCatcher extends cdk.NestedStack {
    readonly _newsConfigNamespace:string = "com.analyze.news.config";

    constructor(scope: cdk.Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        const _eventBusArn = new cdk.CfnParameter(this, 'EventBus', {
            type: 'String',
            description: 'The ARN of the Event Bus messaging backbone',
            allowedPattern: '^arn:\\S+:events:\\S+:\\d{12}:event-bus/\\S+$',
            constraintDescription: 'Please provide the ARN of the Event Bus messaging backbone'
        });

        const _streamArn = new cdk.CfnParameter(this, 'StreamARN', {
            type: 'String',
            description: 'The name of the stream where the RSS feeds should be published for analysis',
            allowedPattern: '^arn:\\S+:kinesis:\\S+:\\d{12}:stream/\\S+$',
            constraintDescription: 'Please provide the Kinesis Stream name'
        });

        const _newsSearchQuery = new cdk.CfnParameter(this, 'NewsSearchQuery', {
            type: 'String',
            description: 'Provide any keyword (optional) to filter news feeds. Only feeds containing the keyword will be processed.'+
                ' If no keyword is provided, feeds will not be filtered',
            constraintDescription: 'Please enter the keyword to use to filter RSS news feed'
        });

        const _newsFeedConfigParam = new cdk.CfnParameter(this, 'Config', {
            type: 'String',
            description: 'Provide configuration for RSS feeds. This parameter should be configured as a JSON string. Here is a sample configuration '+
                '{"country":"ALL", "language":"ALL", "topic":"ALL"}. For Country and language use ISO code. The list of superset of all supported topics '+
                'is: "tech", "news", "business", "science", "finance", "food", "politics", "economics", "travel", "entertainment", "music", "sport", "world".' +
                'Note: not all topics are supported for each RSS provider. Setting the value as "ALL", is treated as a wild character search',
            default: '{"country":"ALL", "language":"ALL", "topic":"ALL"}',
        });

        const ingestFrequency = new cdk.CfnParameter(this, 'IngestFrequency', {
            type: 'String',
            default: 'cron(23 0 * * ? *)', // default once a day at GMT 23:00 hours
            description: 'The frequency at which RSS Feeds should be pulled. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: DiscoveringHotTopicsStack.cronRegex,
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(0/5 * * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _stream = kinesis.Stream.fromStreamArn(this, 'PublishCommentsStream', _streamArn.valueAsString);
        const _eventBus = events.EventBus.fromEventBusArn(this, 'Bus', _eventBusArn.valueAsString) as events.EventBus;

        const _customDataIngestion = new DataIngestionTemplate(this, 'RSSNewsFeedIngestion', {
            source: {
                lambdaFunctionProps: {
                    description: 'This lambda function picks up the configuration for RSS news feeds',
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.publish_config_handler',
                    code: lambda.Code.fromAsset('lambda/capture_news_feed'),
                    environment: {
                        INGESTION_NAMESPACE: this._newsConfigNamespace,
                        CONFIG_PARAM: _newsFeedConfigParam.valueAsString,
                        SEARCH_QUERY: _newsSearchQuery.valueAsString,
                    },
                    timeout: cdk.Duration.minutes(15),
                    memorySize: 256
                }
            },
            target: {
                lambdaFunctionProps: {
                    description: 'This lambda function pulls news feeds based on the above configuration received in the event from Amazon Event Bridge',
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.process_config_handler',
                    code: lambda.Code.fromAsset('lambda/capture_news_feed'),
                    environment: {
                        INGESTION_NAMESPACE: this._newsConfigNamespace,
                        STREAM_NAME: _stream.streamName,
                    },
                    reservedConcurrentExecutions: 1, // this is to throttle consumption of config events and also putting onto the data stream
                    timeout: cdk.Duration.minutes(15),
                    memorySize: 256
                },
                tableProps: {
                    partitionKey: {
                        name: 'ID',
                        type: dynamodb.AttributeType.STRING
                    },
                    sortKey: {
                        name: 'LAST_PUBLISHED_TIMESTAMP',
                        type: dynamodb.AttributeType.STRING
                    },
                    timeToLiveAttribute: 'EXP_DATE'
                }
            },
            ingestionEventRuleProps: {
                eventPattern: {
                    account: [ cdk.Aws.ACCOUNT_ID ],
                    region: [ cdk.Aws.REGION ],
                    source: [ this._newsConfigNamespace ]
                }
            },
            existingIngestionEventBus: _eventBus
        });

        _stream.grantWrite(_customDataIngestion.targetLambda);

        const rule = new events.Rule(this, 'PollFrequency', {
            schedule: events.Schedule.expression(ingestFrequency.valueAsString)
        });

        rule.addTarget(new LambdaFunction(_customDataIngestion.sourceLambda));
    }
}