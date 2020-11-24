#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { CfnDataCatalogEncryptionSettings, CfnSecurityConfiguration, Database, Table } from '@aws-cdk/aws-glue';
import { ServicePrincipal } from '@aws-cdk/aws-iam';
import { Key } from '@aws-cdk/aws-kms';
import { Bucket } from '@aws-cdk/aws-s3';
import { Aws, Construct } from '@aws-cdk/core';
import { StorageCrawler } from '../storage/storage-crawler-construct';
import { EntityTable } from './entity-table-construct';
import { KeyPhraseTable } from './keyphrase-table-construct';
import { ModerationLabelsTable } from './moderation-labels-table-construct';
import { SentimentTable } from './sentiment-table-construct';
import { TextInImgEntityTable } from './text-in-image-entities-table-construct';
import { TextInImgKeyPhraseTable } from './text-in-img-keyphrase-table-construct';
import { TextInImgSentimentTable } from './text-in-img-sentiment-table-construct';
import { TopicMappingsTable } from './topicmappings-table-construct';
import { TopicsTable } from './topics-table-construct';

export interface InferenceDatabaseProps {
    readonly s3InputDataBucket: Bucket,
    readonly tablePrefixMappings: Map<string, string>,
    readonly glueKMSKey: Key,
    readonly s3LoggingBucket: Bucket
}
export class InferenceDatabase extends Construct {
    private _database: Database;
    private _tableMap: Map<any, Table>;

    constructor (scope: Construct, id: string, props: InferenceDatabaseProps) {
        super(scope, id);

        props.glueKMSKey.grantEncryptDecrypt(new ServicePrincipal(`logs.${Aws.REGION}.amazonaws.com`));

        new CfnSecurityConfiguration (this, 'GlueSecConfig', {
            name: 'socialmediadb-sec-config',
            encryptionConfiguration: {
                cloudWatchEncryption: {
                    cloudWatchEncryptionMode: 'SSE-KMS',
                    kmsKeyArn: props.glueKMSKey.keyArn
                },
                s3Encryptions: [{
                    s3EncryptionMode: 'SSE-S3'
                }]
            }
        });

        this._database = new Database(this, 'TweetDB', {
            databaseName: 'socialmediadb'
        });

        new CfnDataCatalogEncryptionSettings(this, 'TweetDBEncryption', {
             catalogId: this._database.catalogId,
             dataCatalogEncryptionSettings: {
                 encryptionAtRest: {
                     catalogEncryptionMode: 'SSE-KMS'
                 },
             }
         });

        this._tableMap = new Map();
        this._tableMap.set('Sentiment', new SentimentTable(this, 'Sentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Sentiment')!}/`,
            tableName: props.tablePrefixMappings.get('Sentiment')!,
            database: this._database
        }).table);

        this._tableMap.set('Entity', new EntityTable(this, 'Entity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Entity')!}/`,
            tableName: props.tablePrefixMappings.get('Entity')!,
            database: this._database
        }).table);

        this._tableMap.set('KeyPhrase', new KeyPhraseTable(this, 'KeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('KeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('KeyPhrase')!,
            database: this._database
        }).table);

        this._tableMap.set('Topics', new TopicsTable(this, 'Topics', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Topics')!}/`,
            tableName: props.tablePrefixMappings.get('Topics')!,
            database: this._database
        }).table);

        this._tableMap.set('TopicMappings', new TopicMappingsTable(this, 'TopicMappings', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TopicMappings')!}/`,
            tableName: props.tablePrefixMappings.get('TopicMappings')!,
            database: this._database
        }).table);

        this._tableMap.set('TxtInImgEntity', new TextInImgEntityTable(this, 'TxtInImgEntity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgEntity')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgEntity')!,
            database: this._database
        }).table);

        this._tableMap.set('TxtInImgKeyPhrase', new TextInImgKeyPhraseTable(this, 'TxtInImgKeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgKeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgKeyPhrase')!,
            database: this._database
        }).table);

        this._tableMap.set('TxtInImgSentiment', new TextInImgSentimentTable(this, 'TxtInImgSentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgSentiment')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgSentiment')!,
            database: this._database
        }).table);

        this._tableMap.set('ModerationLabels', new ModerationLabelsTable(this, 'ModerationLabels', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('ModerationLabels')!}/`,
            tableName: props.tablePrefixMappings.get('ModerationLabels')!,
            database: this._database
        }).table);

        new StorageCrawler(this, 'HotTopicsDB', {
            s3Bucket: props.s3InputDataBucket,
            databaseName: this._database.databaseName,
            keyArn: props.glueKMSKey.keyArn,
            tableMap: props.tablePrefixMappings
        });
    }

    public get database(): Database {
        return this._database;
    }

    public get tableMap(): Map<any, Table> {
        return this._tableMap;
    }
}