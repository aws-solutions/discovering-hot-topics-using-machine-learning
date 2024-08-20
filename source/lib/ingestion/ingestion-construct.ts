#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CustomIngestion } from './custom-ingestion';
import { FeedConsumer } from './feed-consumer-construct';
import { NewsCatcher } from './newscatcher-stack';
import { RedditIngestion } from './reddit-ingestion';
import { YoutubeComments } from './youtube-comments-stacks';

export interface IngestionProps {
    readonly s3LoggingBucket: s3.Bucket;
    readonly deployRSSNewsFeeds: cdk.CfnParameter;
    readonly rssNewsFeedQueryParameter?: cdk.CfnParameter;
    readonly rssNewsFeedConfig?: cdk.CfnParameter;
    readonly rssNewsFeedIngestFreq?: cdk.CfnParameter;
    readonly deployYouTubeComments: cdk.CfnParameter;
    readonly youTubeSearchQuery?: cdk.CfnParameter;
    readonly youTubeChannel?: cdk.CfnParameter;
    readonly youTubeSearchFreq?: cdk.CfnParameter;
    readonly youtTubeApiKey?: cdk.CfnParameter;
    readonly deployRedditIngestion: cdk.CfnParameter;
    readonly redditAPIKey?: cdk.CfnParameter;
    readonly redditIngestionFreq?: cdk.CfnParameter;
    readonly subRedditsToFollow?: cdk.CfnParameter;
    readonly deployCustomIngestion: cdk.CfnParameter;
    readonly integrationEventBus: events.IEventBus;
    readonly metadataNS: string;
}

export class Ingestion extends Construct {
    public readonly consumerLambdaFunc;

    constructor(scope: Construct, id: string, props: IngestionProps) {
        super(scope, id);

        const _feedConsumerlambda = new FeedConsumer(this, 'FeedConsumer', {
            functionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/ingestion-consumer'),
                timeout: cdk.Duration.minutes(5),
                reservedConcurrentExecutions: 1 // adding to throttle submissions to step functions
            },
            batchSize: 5,
            shardCount: 1
        });
        this.consumerLambdaFunc = _feedConsumerlambda.lambdaFunction;
        NagSuppressions.addResourceSuppressions(_feedConsumerlambda, [
            { id: 'AwsSolutions-SQS3', reason: 'SQS queue is used as destination for discarded records from Kinesis stream' }
        ], true);

        // creating a common event bus messaging backbone across different ingestion sources
        const _eventBus = new events.EventBus(this, 'Bus');

        const _JSON_FILE_EXTN_LENGTH = '.json'.length;
        const _newsCatcher = new NewsCatcher(this, 'NewsCatcher', {
            description: `(${this.node.tryGetContext(
                'solution_id'
            )}n-newsfeed) - Discovering Hot Topics using Machine Learning nested Newsfeed ingestion resources - Version %%VERSION%%`,
            parameters: {
                'EventBus': _eventBus.eventBusArn,
                'StreamARN': _feedConsumerlambda.kinesisStream.streamArn,
                // if the search query is blank it acts as wild char search ('*'). All feeds no filters
                'NewsSearchQuery': props.rssNewsFeedQueryParameter!.valueAsString
                    ? props.rssNewsFeedQueryParameter!.valueAsString
                    : '',
                'Config': props.rssNewsFeedConfig!.valueAsString,
                'IngestFrequency': props.rssNewsFeedIngestFreq!.valueAsString
            }
        });
        _newsCatcher.nestedStackResource!.addMetadata(
            'nestedStackFileName',
            _newsCatcher.templateFile.slice(0, -_JSON_FILE_EXTN_LENGTH)
        );

        const _deployRSSFeedsIngestionCondition = new cdk.CfnCondition(this, 'DeployRSSFeeds', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(props.deployRSSNewsFeeds, 'Yes'),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.rssNewsFeedIngestFreq, ''))
            )
        });
        _newsCatcher.nestedStackResource!.cfnOptions.condition = _deployRSSFeedsIngestionCondition;

        // YouTube ingestion nested stack
        const _youTubeComments = new YoutubeComments(this, 'YouTubeCommentsIngestion', {
            description: `(${this.node.tryGetContext(
                'solution_id'
            )}n-youtube) - Discovering Hot Topics using Machine Learning nested Youtube comment ingestion resources - Version %%VERSION%%`,
            parameters: {
                'EventBus': _eventBus.eventBusArn,
                'StreamARN': _feedConsumerlambda.kinesisStream.streamArn,
                'YoutubeAPIKey': props.youtTubeApiKey?.valueAsString!,
                'YouTubeSearchIngestionFreq': props.youTubeSearchFreq?.valueAsString!,
                'YouTubeChannel': props.youTubeChannel?.valueAsString!,
                'YoutubeSearchQuery': props.youTubeSearchQuery?.valueAsString!
            }
        });
        _youTubeComments.nestedStackResource!.addMetadata(
            'nestedStackFileName',
            _youTubeComments.templateFile.slice(0, -_JSON_FILE_EXTN_LENGTH)
        );

        const _deployYoutubeCommentsCondition = new cdk.CfnCondition(this, 'DeployYouTubeComments', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(props.deployYouTubeComments.valueAsString, 'Yes'),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.youTubeSearchFreq, '')),
                cdk.Fn.conditionNot(
                    cdk.Fn.conditionAnd(
                        cdk.Fn.conditionEquals(props.youTubeSearchQuery, ''),
                        cdk.Fn.conditionEquals(props.youTubeChannel, '')
                    )
                ),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.youtTubeApiKey, ''))
            )
        });
        _youTubeComments.nestedStackResource!.cfnOptions.condition = _deployYoutubeCommentsCondition;

        const _customIngestion = new CustomIngestion(this, 'S3CustomIngestion', {
            description: `(${this.node.tryGetContext(
                'solution_id'
            )}n-custom) - Discovering Hot Topics using Machine Learning nested Custom ingestion resources - Version %%VERSION%%`,
            parameters: {
                'StreamARN': _feedConsumerlambda.kinesisStream.streamArn,
                'IntegrationBus': props.integrationEventBus.eventBusArn,
                'S3AccessLoggingBucket': props.s3LoggingBucket.bucketArn,
                'MetadataNS': props.metadataNS
            }
        });
        _customIngestion.nestedStackResource!.addMetadata(
            'nestedStackFileName',
            _customIngestion.templateFile.slice(0, -_JSON_FILE_EXTN_LENGTH)
        );

        const _deployCustomIngestionCondition = new cdk.CfnCondition(this, 'DeployCustomIngestion', {
            expression: cdk.Fn.conditionEquals(props.deployCustomIngestion.valueAsString, 'Yes')
        });
        _customIngestion.nestedStackResource!.cfnOptions.condition = _deployCustomIngestionCondition;
        (_customIngestion.node.defaultChild as cdk.CfnResource).addDependency(
            props.s3LoggingBucket.node.tryFindChild('Policy')?.node.tryFindChild('Resource') as cdk.CfnResource
        );

        const _redditIngesiton = new RedditIngestion(this, 'RedditIngestion', {
            description: `(${this.node.tryGetContext(
                'solution_id'
            )}n-reddit) - Discovering Hot Topics using Machine Learning nested Reddit comment ingestion resources - Version %%VERSION%%`,
            parameters: {
                'RedditAPIKey': props.redditAPIKey!.valueAsString,
                'StreamARN': _feedConsumerlambda.kinesisStream.streamArn,
                'EventBus': _eventBus.eventBusArn,
                'SubRedditsToFollow': props.subRedditsToFollow!.valueAsString,
                'RedditIngestionFrequency': props.redditIngestionFreq?.valueAsString!
            }
        });
        _redditIngesiton.nestedStackResource?.addMetadata(
            'nestedStackFileName',
            _redditIngesiton.templateFile.slice(0, -_JSON_FILE_EXTN_LENGTH)
        );

        const _deployRedditIngestionCondition = new cdk.CfnCondition(this, 'DeployRedditIngestion', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(props.deployRedditIngestion.valueAsString, 'Yes'),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.redditAPIKey, '')),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.redditIngestionFreq, '')),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.subRedditsToFollow, ''))
            )
        });

        _redditIngesiton.nestedStackResource!.cfnOptions.condition = _deployRedditIngestionCondition;

        new cdk.CfnOutput(this, 'S3BucketToUploadData', {
            value: _customIngestion.s3Bucket.urlForObject(),
            description: 'Bucket location to upload source files for ingestion',
            condition: _deployCustomIngestionCondition
        });
    }
}
