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


import * as events from '@aws-cdk/aws-events';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { FeedConsumer } from './feed-consumer-construct';
import { NewsCatcher } from './newscatcher-stack';
import { TwitterSearchIngestion } from './twitter-search-stack';

export interface IngestionProps {
    readonly ingestFrequency?: cdk.CfnParameter;
    readonly twitterQueryParameter?: cdk.CfnParameter;
    readonly supportedLang?: cdk.CfnParameter; //comma separated values of language codes
    readonly credentialKeyPath?: cdk.CfnParameter;
    readonly s3LoggingBucket: s3.Bucket;
    readonly rssNewsFeedQueryParameter?: cdk.CfnParameter;
    readonly rssNewsFeedConfig?: cdk.CfnParameter;
    readonly rssNewsFeedIngestFreq?: cdk.CfnParameter;
    readonly deployTwitter: cdk.CfnParameter;
    readonly deployRSSNewsFeeds: cdk.CfnParameter;
}

export class Ingestion extends cdk.Construct {
    private readonly _consumerLambdaFunc;

    constructor(scope: cdk.Construct, id: string, props: IngestionProps) {
        super(scope, id);

        const _feedConsumerlambda = new FeedConsumer(this, 'FeedConsumer', {
            functionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/ingestion-consumer'),
                timeout: cdk.Duration.minutes(5),
                reservedConcurrentExecutions: 1 // adding to throttle submissions to step functions
            },
            batchSize: 5,
            shardCount: 1,
        });
        this._consumerLambdaFunc = _feedConsumerlambda.lambdaFunction;

        // creating a common event bus messaging backbone across different ingestion sources
        const _eventBus = new events.EventBus(this, 'Bus');

        const _twitterSearch = new TwitterSearchIngestion(this, 'TwitterSearch', {
            parameters: {
                "SupportedLang": props.supportedLang!.valueAsString,
                "QueryParameter": props.twitterQueryParameter!.valueAsString,
                "SSMPathForCredentials": props.credentialKeyPath!.valueAsString,
                "IngestQueryFrequency": props.ingestFrequency!.valueAsString,
                "StreamARN": _feedConsumerlambda.kinesisStream.streamArn
            }
        });
        _twitterSearch.nestedStackResource!.addMetadata('nestedStackFileName', _twitterSearch.templateFile.slice(0, -5));

        const _deployTwitterIngestionCondition = new cdk.CfnCondition(this, 'DeployTwitterIngestion', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(props.deployTwitter, "Yes"),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.twitterQueryParameter, "")),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.ingestFrequency, "")),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.credentialKeyPath, ""))
        )});
        // TODO - This is a temporary patch for Sonarqube, it misinterprets the use of '?' here as a control statement
        _twitterSearch.nestedStackResource?.addOverride('Condition', _deployTwitterIngestionCondition.logicalId); // NOSONAR - Rule Non-empty statements should change control flow or have at least one side-effect

        const _newsCatcher = new NewsCatcher(this, 'NewsCatcher', {
            parameters: {
                "EventBus": _eventBus.eventBusArn,
                "StreamARN": _feedConsumerlambda.kinesisStream.streamArn,
                // if the search query is blank it acts as wild char search ('*'). All feeds no filters
                "NewsSearchQuery": props.rssNewsFeedQueryParameter!.valueAsString? props.rssNewsFeedQueryParameter!.valueAsString : '',
                "Config": props.rssNewsFeedConfig!.valueAsString,
                "IngestFrequency": props.rssNewsFeedIngestFreq!.valueAsString
            }
        });
        _newsCatcher.nestedStackResource!.addMetadata('nestedStackFileName', _newsCatcher.templateFile.slice(0, -5));

        const _deployRSSFeedsIngestionCondition = new cdk.CfnCondition(this, 'DeployRSSFeeds', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionEquals(props.deployRSSNewsFeeds, "Yes"),
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.rssNewsFeedIngestFreq, ""))
            )});
        // TODO - This is a temporary patch for Sonarqube, it misinterprets the use of '?' here as a control statement
        _newsCatcher.nestedStackResource?.addOverride('Condition', _deployRSSFeedsIngestionCondition.logicalId); // NOSONAR - Rule Non-empty statements should change control flow or have at least one side-effect
    }

    public get consumerLambdaFunc(): lambda.Function {
        return this._consumerLambdaFunc
    }
}
