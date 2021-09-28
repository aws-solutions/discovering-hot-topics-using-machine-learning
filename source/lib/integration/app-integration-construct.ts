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

import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Bucket, CfnBucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';
import { buildS3Bucket } from '@aws-solutions-constructs/core';
import { EventStorage } from '../storage/event-storage-construct';
import { InferenceDatabase } from '../visualization/inf-database-construct';
import { EventManager } from './event-manager-construct';
import { Config, EventRule } from './event-rule-construct';
import { TextAnalysisProxy } from './text-analysis-proxy';
import { TopicAnalysisProxy } from './topic-analysis-proxy';

export interface AppIntegrationProps {
    readonly textAnalysisInfNS: string,
    readonly topicsAnalysisInfNS: string,
    readonly topicMappingsInfNS: string
    readonly tableMappings: Map<string, string>,
    readonly s3LoggingBucket: Bucket
}

export class AppIntegration extends Construct {
    private eventRule: EventRule;
    private _s3Bucket: Bucket;

    constructor(scope: Construct, id: string, props: AppIntegrationProps) {

        super(scope, id);

        // Setup S3 Bucket
        [ this._s3Bucket ] = buildS3Bucket(this, {
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}/`
            }
        });

        // Extract the CfnBucket from the s3Bucket
        const s3BucketResource = this._s3Bucket.node.defaultChild as CfnBucket;

        s3BucketResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W51',
                    reason: `This S3 bucket Bucket does not need a bucket policy. The access to the bucket is restricted to Kinesis Fireshose using IAM Role policy`
                }]
            }
        };

        // start of storage and visualization
        const infDatabase = new InferenceDatabase(this, 'InfDB', {
            s3InputDataBucket: this._s3Bucket,
            tablePrefixMappings: props.tableMappings,
            s3LoggingBucket: props.s3LoggingBucket
        });
        // end of storage and visualization

        const eventStorageMap: Map<string, EventStorage> = new Map();

        props.tableMappings.forEach((value: string, key: string) => {
            eventStorageMap.set(key, new EventStorage(this, key, {
                compressionFormat: 'UNCOMPRESSED',
                prefix: `${value}/`,
                aggregateByDay: true,
                convertData: true,
                database: infDatabase.database,
                tableName: infDatabase.tableMap.get(key)!.tableName,
                s3Bucket: this._s3Bucket,
                keyArn: infDatabase.glueKMSKeyArn
            }));
        });

        const textAnalysisLambda = new TextAnalysisProxy(this, 'TextAnalysis', {
            sentimentStorage: eventStorageMap.get('Sentiment')!,
            entityStorage: eventStorageMap.get('Entity')!,
            keyPhraseStorage: eventStorageMap.get('KeyPhrase')!,
            txtInImgEntityStorage: eventStorageMap.get('TxtInImgEntity')!,
            txtInImgSentimentStorage: eventStorageMap.get('TxtInImgSentiment')!,
            txtInImgKeyPhraseStorage: eventStorageMap.get('TxtInImgKeyPhrase')!,
            moderationLabelStorage: eventStorageMap.get('ModerationLabels')!,
            twFeedStorage: eventStorageMap.get('TwFeedStorage')!,
            newsFeedStorage: eventStorageMap.get('NewsFeedStorage')!,
            youTubeCommentsStorage: eventStorageMap.get('YouTubeComments')!,
            textAnalysisInfNS: props.textAnalysisInfNS,
        });

        // end of temporary mechanism to create tables in Glue tables

        const topicAnalysis = new TopicAnalysisProxy(this, 'TopicAnalysis', {
            topicsStorage: eventStorageMap.get('Topics')!,
            topicMappingsStorage: eventStorageMap.get('TopicMappings')!,
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
            configs: configs
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
