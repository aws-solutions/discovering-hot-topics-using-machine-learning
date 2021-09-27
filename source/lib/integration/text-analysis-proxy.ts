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

import { CfnPolicy, Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';
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
    readonly textAnalysisInfNS: string;
}

export class TextAnalysisProxy extends Construct {
    private textAnalysisLambda: Function;

    constructor(scope: Construct, id: string, props: TextAnalysisProxyProps) {
        super(scope, id);

        this.textAnalysisLambda = buildLambdaFunction(this,  {
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_14_X,
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
                    TEXT_ANALYSIS_NS: props.textAnalysisInfNS
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
            props.youTubeCommentsStorage.deliveryStreamArn
        ];

        this.textAnalysisLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: resourceList,
            actions: [ 'firehose:PutRecord', 'firehose:PutRecordBatch' ]
        }));

        (this.textAnalysisLambda.role?.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as CfnPolicy).addMetadata('cfn_nag', {
            rules_to_suppress: [{
                id: 'W76',
                reason: 'The lambda role policy requires to access multiple firehose buckets. Hence suppressing the SCPM rule'
            }, {
                id: 'W12',
                reason: 'Lambda needs the following minimum required permissions to send trace data to X-Ray and access ENIs in a VPC.'
            }]
        });
    }

    public get lambdaFunction(): Function {
        return this.textAnalysisLambda;
    }
}
