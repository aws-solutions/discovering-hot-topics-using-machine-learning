#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { Duration } from 'aws-cdk-lib';
import { CfnPolicy, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EventStorage } from '../storage/event-storage-construct';

export interface TextAnalysisProxyProps {
    readonly sentimentStorage: EventStorage;
    readonly entityStorage: EventStorage;
    readonly keyPhraseStorage: EventStorage;
    readonly txtInImgSentimentStorage: EventStorage;
    readonly txtInImgEntityStorage: EventStorage;
    readonly txtInImgKeyPhraseStorage: EventStorage;
    readonly moderationLabelStorage: EventStorage;
    readonly twFeedStorage: EventStorage;
    readonly newsFeedStorage: EventStorage;
    readonly youTubeCommentsStorage: EventStorage;
    readonly customIngestionStorage: EventStorage;
    readonly customIngestionLoudnessStorage: EventStorage;
    readonly customIngestionItemStorage: EventStorage;
    readonly metadataStorage: EventStorage;
    readonly redditCommentsStorage: EventStorage;
    readonly textAnalysisInfNS: string;
    readonly metadataNS: string;
}

export class TextAnalysisProxy extends Construct {
    private textAnalysisLambda: Function;

    constructor(scope: Construct, id: string, props: TextAnalysisProxyProps) {
        super(scope, id);

        this.textAnalysisLambda = buildLambdaFunction(this, {
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/firehose-text-proxy`),
                environment: {
                    SENTIMENT_FIREHOSE: props.sentimentStorage.deliveryStreamName,
                    ENTITIES_FIREHOSE: props.entityStorage.deliveryStreamName,
                    KEYPHRASE_FIREHOSE: props.keyPhraseStorage.deliveryStreamName,
                    TXT_IN_IMG_SENTIMENT_FIREHOSE: props.txtInImgSentimentStorage.deliveryStreamName,
                    TXT_IN_IMG_ENTITY_FIREHOSE: props.txtInImgEntityStorage.deliveryStreamName,
                    TXT_IN_IMG_KEYPHRASE_FIREHOSE: props.txtInImgKeyPhraseStorage.deliveryStreamName,
                    MODERATION_LABELS_FIREHOSE: props.moderationLabelStorage.deliveryStreamName,
                    TW_FEED_STORAGE: props.twFeedStorage.deliveryStreamName,
                    NEWSFEEDS_FEED_STORAGE: props.newsFeedStorage.deliveryStreamName,
                    YOUTUBECOMMENTS_FEED_STORAGE: props.youTubeCommentsStorage.deliveryStreamName,
                    CUSTOMINGESTION_FEED_STORAGE: props.customIngestionStorage.deliveryStreamName,
                    CUSTOMINGESTIONMETADATA_FEED_STORAGE: props.metadataStorage.deliveryStreamName,
                    CUSTOMINGESTIONLOUDNESS_FEED_STORAGE: props.customIngestionLoudnessStorage.deliveryStreamName,
                    CUSTOMINGESTIONITEM_FEED_STORAGE: props.customIngestionItemStorage.deliveryStreamName,
                    REDDIT_FEED_STORAGE: props.redditCommentsStorage.deliveryStreamName,
                    TEXT_ANALYSIS_NS: props.textAnalysisInfNS,
                    METADATA_NS: props.metadataNS
                },
                timeout: Duration.minutes(15)
            }
        });

        const resourceList = [
            props.sentimentStorage.deliveryStreamArn,
            props.entityStorage.deliveryStreamArn,
            props.keyPhraseStorage.deliveryStreamArn,
            props.txtInImgSentimentStorage.deliveryStreamArn,
            props.txtInImgEntityStorage.deliveryStreamArn,
            props.txtInImgKeyPhraseStorage.deliveryStreamArn,
            props.moderationLabelStorage.deliveryStreamArn,
            props.twFeedStorage.deliveryStreamArn,
            props.newsFeedStorage.deliveryStreamArn,
            props.youTubeCommentsStorage.deliveryStreamArn,
            props.customIngestionStorage.deliveryStreamArn,
            props.customIngestionLoudnessStorage.deliveryStreamArn,
            props.customIngestionItemStorage.deliveryStreamArn,
            props.metadataStorage.deliveryStreamArn,
            props.redditCommentsStorage.deliveryStreamArn
        ];

        this.textAnalysisLambda.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: resourceList,
                actions: ['firehose:PutRecord', 'firehose:PutRecordBatch']
            })
        );

        (
            this.textAnalysisLambda.role?.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as CfnPolicy
        ).addMetadata('cfn_nag', {
            rules_to_suppress: [
                {
                    id: 'W76',
                    reason: 'The lambda role policy requires to access multiple firehose buckets. Hence suppressing the SPCM rule'
                },
                {
                    id: 'W12',
                    reason: 'Lambda needs the following minimum required permissions to send trace data to X-Ray and access ENIs in a VPC.'
                }
            ]
        });
    }

    public get lambdaFunction(): Function {
        return this.textAnalysisLambda;
    }
}
