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

import { CfnDataCatalogEncryptionSettings, CfnSecurityConfiguration, Database, ITable } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import { Aws, Construct } from '@aws-cdk/core';
import { StorageCrawler } from '../storage/storage-crawler-construct';
import { EntityTable } from './entity-table-construct';
import { KeyPhraseTable } from './keyphrase-table-construct';
import { ModerationLabelsTable } from './moderation-labels-table-construct';
import { NewsFeedTable } from './newsfeed-table-construct';
import { SentimentTable } from './sentiment-table-construct';
import { TextInImgEntityTable } from './text-in-image-entities-table-construct';
import { TextInImgKeyPhraseTable } from './text-in-img-keyphrase-table-construct';
import { TextInImgSentimentTable } from './text-in-img-sentiment-table-construct';
import { TopicMappingsTable } from './topicmappings-table-construct';
import { TopicsTable } from './topics-table-construct';
import { TwitterTable } from './twitter-table-construct';
import { YoutubeCommentsTable } from './youtubecomments-table-construct';

export interface InferenceDatabaseProps {
    readonly s3InputDataBucket: Bucket,
    readonly tablePrefixMappings: Map<string, string>,
    readonly s3LoggingBucket: Bucket
}
export class InferenceDatabase extends Construct {
    private _database: Database;
    private _tableMap: Map<any, ITable>;
    private _glueKMSKey: string;

    constructor (scope: Construct, id: string, props: InferenceDatabaseProps) {
        super(scope, id);

        this._glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;

        new CfnSecurityConfiguration (this, 'GlueSecConfig', {
            name: 'socialmediadb-sec-config',
            encryptionConfiguration: {
                cloudWatchEncryption: {
                    cloudWatchEncryptionMode: 'SSE-KMS',
                    kmsKeyArn: this._glueKMSKey
                },
                s3Encryptions: [{
                    s3EncryptionMode: 'SSE-S3'
                }],
                jobBookmarksEncryption: {
                    jobBookmarksEncryptionMode: 'CSE-KMS',
                    kmsKeyArn: this._glueKMSKey
                }
            }
        });

        this._database = new Database(this, 'TweetDB', {
            databaseName: 'socialmediadb'
        });

        new CfnDataCatalogEncryptionSettings(this, 'TweetDBEncryption', {
             catalogId: this._database.catalogId,
             dataCatalogEncryptionSettings: {
                 encryptionAtRest: {
                     catalogEncryptionMode: 'SSE-KMS',
                     sseAwsKmsKeyId: 'alias/aws/glue'
                 },
             }
         });

        this._tableMap = new Map();
        const sentimentTable = new SentimentTable(this, 'Sentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Sentiment')!}/`,
            tableName: props.tablePrefixMappings.get('Sentiment')!,
            database: this._database
        });
        this._tableMap.set('Sentiment', sentimentTable.table);

        const entityTable = new EntityTable(this, 'Entity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Entity')!}/`,
            tableName: props.tablePrefixMappings.get('Entity')!,
            database: this._database
        });
        this._tableMap.set('Entity', entityTable.table);

        const keyphraseTable = new KeyPhraseTable(this, 'KeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('KeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('KeyPhrase')!,
            database: this._database
        });
        this._tableMap.set('KeyPhrase', keyphraseTable.table);

        const topicsTable = new TopicsTable(this, 'Topics', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Topics')!}/`,
            tableName: props.tablePrefixMappings.get('Topics')!,
            database: this._database
        });
        this._tableMap.set('Topics', topicsTable.table);

        const topicMappingsTable = new TopicMappingsTable(this, 'TopicMappings', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TopicMappings')!}/`,
            tableName: props.tablePrefixMappings.get('TopicMappings')!,
            database: this._database
        });
        this._tableMap.set('TopicMappings', topicMappingsTable.table);

        const txtInImgEntityTable = new TextInImgEntityTable(this, 'TxtInImgEntity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgEntity')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgEntity')!,
            database: this._database
        });
        this._tableMap.set('TxtInImgEntity', txtInImgEntityTable.table);

        const txtInImgKeyPhraseTable = new TextInImgKeyPhraseTable(this, 'TxtInImgKeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgKeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgKeyPhrase')!,
            database: this._database
        });
        this._tableMap.set('TxtInImgKeyPhrase', txtInImgKeyPhraseTable.table);

        const txtInImgSentiment = new TextInImgSentimentTable(this, 'TxtInImgSentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgSentiment')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgSentiment')!,
            database: this._database
        });
        this._tableMap.set('TxtInImgSentiment', txtInImgSentiment.table);

        const moderationLabelsTable = new ModerationLabelsTable(this, 'ModerationLabels', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('ModerationLabels')!}/`,
            tableName: props.tablePrefixMappings.get('ModerationLabels')!,
            database: this._database
        });
        this._tableMap.set('ModerationLabels', moderationLabelsTable.table);

        const twitterTable = new TwitterTable(this, 'Twitter', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TwFeedStorage')!}/`,
            tableName: props.tablePrefixMappings.get('TwFeedStorage')!,
            database: this._database
        });
        this._tableMap.set('TwFeedStorage', twitterTable.table);

        const newsFeedTable = new NewsFeedTable(this, 'NewsFeed', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('NewsFeedStorage')!}/`,
            tableName: props.tablePrefixMappings.get('NewsFeedStorage')!,
            database: this._database
        });
        this._tableMap.set('NewsFeedStorage', newsFeedTable.table);

        const youtubeCommentsTable = new YoutubeCommentsTable(this, 'YoutubeComments', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('YouTubeComments')!}/`,
            tableName: props.tablePrefixMappings.get('YouTubeComments')!,
            database: this._database
        });
        this._tableMap.set('YouTubeComments', youtubeCommentsTable.table);

        const storageCrawler = new StorageCrawler(this, 'HotTopicsDB', {
            s3Bucket: props.s3InputDataBucket,
            databaseName: this._database.databaseName,
            keyArn: this._glueKMSKey,
            tableMap: props.tablePrefixMappings
        });

        storageCrawler.node.addDependency(entityTable);
        storageCrawler.node.addDependency(keyphraseTable);
        storageCrawler.node.addDependency(topicsTable);
        storageCrawler.node.addDependency(topicMappingsTable);
        storageCrawler.node.addDependency(txtInImgEntityTable);
        storageCrawler.node.addDependency(txtInImgKeyPhraseTable);
        storageCrawler.node.addDependency(txtInImgSentiment);
        storageCrawler.node.addDependency(moderationLabelsTable);
        storageCrawler.node.addDependency(twitterTable);
        storageCrawler.node.addDependency(newsFeedTable);
        storageCrawler.node.addDependency(youtubeCommentsTable);
    }

    public get database(): Database {
        return this._database;
    }

    public get tableMap(): Map<any, ITable> {
        return this._tableMap;
    }

    public get glueKMSKeyArn(): string {
        return this._glueKMSKey;
    }
}
