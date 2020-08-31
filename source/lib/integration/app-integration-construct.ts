#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICNSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { Construct } from '@aws-cdk/core';
import { EventManager } from './event-manager-construct';
import { EventStorage } from '../storage/event-storage-construct';
import { Config, EventRule } from './event-rule-construct';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Bucket } from '@aws-cdk/aws-s3';
import { TextAnalysisProxy } from './text-analysis-proxy';
import { TopicAnalysisProxy } from './topic-analysis-proxy';

export interface AppIntegrationProps {
    readonly textAnalysisInfNS: string,
    readonly topicsAnalysisInfNS: string,
    readonly topicMappingsInfNS: string
    readonly tableMappings: any
}

export class AppIntegration extends Construct {
    private eventRule: EventRule;
    private _s3Bucket: Bucket;

    constructor(scope: Construct, id: string, props: AppIntegrationProps) {
        super(scope, id);

        //TODO - have a direct stream for data, to re removed if it does not work
        // const directStream = new Stream (this, 'DirectStream', {
        //     encryption: StreamEncryption.MANAGED
        // });

        // start of lambda proxy (work around for event bus - kinesis stream integration)
        // const lambdaProxyStream = new Stream (this, 'ProxyInfStrmToGlue', {
        //     encryption: StreamEncryption.MANAGED
        // });

        // const lambdaKinesisPolicy = new PolicyStatement({
        //     resources: [`arn:${Aws.PARTITION}:kinesis:${Aws.REGION}:${Aws.ACCOUNT_ID}:stream/${lambdaProxyStream.streamName}`],
        //     actions: [ 'kinesis:PutRecords', 'kinesis:PutRecord' ]
        // });

        // const proxylambda = buildLambdaFunction(this,  {
        //     deployLambda: true,
        //     lambdaFunctionProps: {
        //         runtime: Runtime.NODEJS_12_X,
        //         handler: 'index.handler',
        //         code: Code.asset(`${__dirname}/../../../../source/integration`),
        //         environment: {
        //             STREAM_NAME: lambdaProxyStream.streamName
        //         }
        //     }
        // });

        // proxylambda.addToRolePolicy(lambdaKinesisPolicy);
        // end of lambda proxy (work-around for event bus - kinesis stream integration)

        // start of temporary mechanism to create tables in Glue tables
        const sentimentStorage = new EventStorage(this, 'Sentiment', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.Sentiment,
        });

        this._s3Bucket = sentimentStorage.s3Bucket;

        const entityStorage = new EventStorage(this, 'Entity', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.Entity,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const keyPhraseStorage = new EventStorage(this, 'KeyPhrase', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.KeyPhrase,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const txtInImgSentimentStorage = new EventStorage(this, 'TxtInImgSentiment', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.TxtInImgSentiment,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const txtInImgEntityStorage = new EventStorage(this, 'TxtInImgEntity', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.TxtInImgEntity,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const txtInImgKeyPhraseStorage = new EventStorage(this, 'TxtInImgKeyPhrase', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.TxtInImgKeyPhrase,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const moderationLabelStorage = new EventStorage(this, 'ModerationLabels', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.ModerationLabels,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const topicsStorage = new EventStorage(this, 'Topics', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.Topics,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const topicMappingsStorage = new EventStorage(this, 'TopicMappings', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: props.tableMappings.TopicMappings,
            s3Bucket: sentimentStorage.s3Bucket
        });

        const textAnalysisLambda = new TextAnalysisProxy(this, 'TextAnalysis', {
            sentimentStorage: sentimentStorage,
            entityStorage: entityStorage,
            keyPhraseStorage: keyPhraseStorage,
            textAnalysisInfNS: props.textAnalysisInfNS,
            txtInImgEntityStorage: txtInImgEntityStorage,
            txtInImgSentimentStorage: txtInImgSentimentStorage,
            txtInImgKeyPhraseStorage: txtInImgKeyPhraseStorage,
            moderationLabelStorage: moderationLabelStorage
        });

        // end of temporary mechanism to create tables in Glue tables

        const topicAnalysis = new TopicAnalysisProxy(this, 'TopicAnalysis', {
            topicsStorage: topicsStorage,
            topicMappingsStorage: topicMappingsStorage,
            topicsAnalysisInfNS: props.topicsAnalysisInfNS,
            topicMappingsInfNS: props.topicMappingsInfNS
        });

        // start of configuring targets for event bus
        const configs: Config[] = [{
            source: [ props.textAnalysisInfNS ],
            ruleTargets: [
                new LambdaFunction(textAnalysisLambda.lambdaFunction),
            ]
        }, {
            source: [ props.topicsAnalysisInfNS, props.topicMappingsInfNS ],
            ruleTargets: [
                new LambdaFunction(topicAnalysis.lambdaFunction)
            ]
        }];

        this.eventRule = new EventRule(this, 'EventRule', {
            configs: configs,
        });
        // end of configuring targets for event bus
    }

    public get eventManager(): EventManager {
        return this.eventRule.eventManager;
    }

    public get s3Bucket(): Bucket {
        return this._s3Bucket;
    }
}
