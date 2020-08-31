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

import { Database, CfnDataCatalogEncryptionSettings, CfnSecurityConfiguration } from '@aws-cdk/aws-glue';
import { Construct, Aws } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Key } from '@aws-cdk/aws-kms';
import { ServicePrincipal } from '@aws-cdk/aws-iam';

import { SentimentTable } from './sentiment-table-construct';
import { EntityTable } from './entity-table-construct';
import { KeyPhraseTable } from './keyphrase-table-construct';
import { TopicsTable } from './topics-table-construct';
import { TopicMappingsTable } from './topicmappings-table-construct';
import { TextInImgEntityTable } from './text-in-image-entities-table-construct';
import { TextInImgKeyPhraseTable } from './text-in-img-keyphrase-table-construct';
import { TextInImgSentimentTable } from './text-in-img-sentiment-table-construct';
import { ModerationLabelsTable } from './moderation-labels-table-construct';

export interface InferenceDatabaseProps {
    readonly s3InputDataBucket: Bucket,
    readonly tableMappings: any
}

export class InferenceDatabase extends Construct {
    constructor (scope: Construct, id: string, props: InferenceDatabaseProps) {
        super(scope, id);

        const key = new Key(this, 'GlueCloudWatch', {
            enableKeyRotation: true
        });

        key.grantEncryptDecrypt(new ServicePrincipal(`logs.${Aws.REGION}.amazonaws.com`));

        new CfnSecurityConfiguration (this, 'GlueSecConfig', {
            name: 'socialmediadb-sec-config',
            encryptionConfiguration: {
                cloudWatchEncryption: {
                    cloudWatchEncryptionMode: 'SSE-KMS',
                    kmsKeyArn: key.keyArn
                },
                s3Encryptions: [{
                    s3EncryptionMode: 'SSE-S3'
                }]
            }
        });

        const tweetDB = new Database(this, 'TweetDB', {
            databaseName: 'socialmediadb',
        });

        new CfnDataCatalogEncryptionSettings(this, 'TweetDBEncryption', {
            catalogId: tweetDB.catalogId,
            dataCatalogEncryptionSettings: {
                encryptionAtRest: {
                    catalogEncryptionMode: 'SSE-KMS'
                },
            }
        });

        new SentimentTable(this, 'Sentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.Sentiment,
            database: tweetDB
        });

        new EntityTable(this, 'Entity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.Entity,
            database: tweetDB
        });

        new KeyPhraseTable(this, 'KeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.KeyPhrase,
            database: tweetDB
        });

        new TopicsTable(this, 'Topics', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.Topics,
            database: tweetDB
        });

        new TopicMappingsTable(this, 'TopicMappings', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.TopicMappings,
            database: tweetDB
        });

        new TextInImgEntityTable(this, 'TxtInImgEntity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: props.tableMappings.TxtInImgEntity,
            database: tweetDB
        });

        new TextInImgKeyPhraseTable(this, 'TxtInImgKeyPhrase', {
            s3BucketPrefix: props.tableMappings.TxtInImgKeyPhrase,
            s3InputDataBucket: props.s3InputDataBucket,
            database: tweetDB
        });

        new TextInImgSentimentTable(this, 'TxtInImgSentiment', {
            s3BucketPrefix: props.tableMappings.TxtInImgSentiment,
            s3InputDataBucket: props.s3InputDataBucket,
            database: tweetDB
        });

        new ModerationLabelsTable(this, 'ModerationLabels', {
            s3BucketPrefix: props.tableMappings.ModerationLabels,
            s3InputDataBucket: props.s3InputDataBucket,
            database: tweetDB
        })
    }
}