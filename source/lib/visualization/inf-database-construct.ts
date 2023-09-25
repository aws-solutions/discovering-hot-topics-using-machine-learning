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

import * as glue from 'aws-cdk-lib/aws-glue';
import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CustomDataTable, LoudnessScoreTable, ItemTable } from './custom-data-table-construct';
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
import { MetdataTable } from './metadata-table-construct';
import { RedditCommentsTable } from './reddit-comments-table-construct';

export interface InferenceDatabaseProps {
    readonly s3InputDataBucket: s3.Bucket;
    readonly tablePrefixMappings: Map<string, string>;
    readonly s3LoggingBucket: s3.Bucket;
}
export class InferenceDatabase extends Construct {
    public readonly database: glue_alpha.Database;
    public readonly tableMap: Map<any, glue.CfnTable>;
    public readonly glueKMSKey: string;

    constructor(scope: Construct, id: string, props: InferenceDatabaseProps) {
        super(scope, id);

        this.glueKMSKey = `arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:alias/aws/glue`;

        new glue.CfnSecurityConfiguration(this, 'GlueSecConfig', {
            name: 'socialmediadb-sec-config',
            encryptionConfiguration: {
                cloudWatchEncryption: {
                    cloudWatchEncryptionMode: 'SSE-KMS',
                    kmsKeyArn: this.glueKMSKey
                },
                s3Encryptions: [
                    {
                        s3EncryptionMode: 'SSE-S3'
                    }
                ],
                jobBookmarksEncryption: {
                    jobBookmarksEncryptionMode: 'CSE-KMS',
                    kmsKeyArn: this.glueKMSKey
                }
            }
        });

        this.database = new glue_alpha.Database(this, 'TweetDB', {
            databaseName: 'socialmediadb'
        });

        new glue.CfnDataCatalogEncryptionSettings(this, 'TweetDBEncryption', {
            catalogId: this.database.catalogId,
            dataCatalogEncryptionSettings: {
                encryptionAtRest: {
                    catalogEncryptionMode: 'SSE-KMS',
                    sseAwsKmsKeyId: 'alias/aws/glue'
                }
            }
        });

        this.tableMap = new Map();
        const sentimentTable = new SentimentTable(this, 'Sentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Sentiment')!}/`,
            tableName: props.tablePrefixMappings.get('Sentiment')!,
            database: this.database
        });
        this.tableMap.set('Sentiment', sentimentTable.table);

        const entityTable = new EntityTable(this, 'Entity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Entity')!}/`,
            tableName: props.tablePrefixMappings.get('Entity')!,
            database: this.database
        });
        this.tableMap.set('Entity', entityTable.table);

        const keyphraseTable = new KeyPhraseTable(this, 'KeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('KeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('KeyPhrase')!,
            database: this.database
        });
        this.tableMap.set('KeyPhrase', keyphraseTable.table);

        const topicsTable = new TopicsTable(this, 'Topics', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Topics')!}/`,
            tableName: props.tablePrefixMappings.get('Topics')!,
            database: this.database
        });
        this.tableMap.set('Topics', topicsTable.table);

        const topicMappingsTable = new TopicMappingsTable(this, 'TopicMappings', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TopicMappings')!}/`,
            tableName: props.tablePrefixMappings.get('TopicMappings')!,
            database: this.database
        });
        this.tableMap.set('TopicMappings', topicMappingsTable.table);

        const txtInImgEntityTable = new TextInImgEntityTable(this, 'TxtInImgEntity', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgEntity')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgEntity')!,
            database: this.database
        });
        this.tableMap.set('TxtInImgEntity', txtInImgEntityTable.table);

        const txtInImgKeyPhraseTable = new TextInImgKeyPhraseTable(this, 'TxtInImgKeyPhrase', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgKeyPhrase')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgKeyPhrase')!,
            database: this.database
        });
        this.tableMap.set('TxtInImgKeyPhrase', txtInImgKeyPhraseTable.table);

        const txtInImgSentiment = new TextInImgSentimentTable(this, 'TxtInImgSentiment', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TxtInImgSentiment')!}/`,
            tableName: props.tablePrefixMappings.get('TxtInImgSentiment')!,
            database: this.database
        });
        this.tableMap.set('TxtInImgSentiment', txtInImgSentiment.table);

        const moderationLabelsTable = new ModerationLabelsTable(this, 'ModerationLabels', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('ModerationLabels')!}/`,
            tableName: props.tablePrefixMappings.get('ModerationLabels')!,
            database: this.database
        });
        this.tableMap.set('ModerationLabels', moderationLabelsTable.table);

        const twitterTable = new TwitterTable(this, 'Twitter', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('TwFeedStorage')!}/`,
            tableName: props.tablePrefixMappings.get('TwFeedStorage')!,
            database: this.database
        });
        this.tableMap.set('TwFeedStorage', twitterTable.table);

        const newsFeedTable = new NewsFeedTable(this, 'NewsFeed', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('NewsFeedStorage')!}/`,
            tableName: props.tablePrefixMappings.get('NewsFeedStorage')!,
            database: this.database
        });
        this.tableMap.set('NewsFeedStorage', newsFeedTable.table);

        const youtubeCommentsTable = new YoutubeCommentsTable(this, 'YoutubeComments', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('YouTubeComments')!}/`,
            tableName: props.tablePrefixMappings.get('YouTubeComments')!,
            database: this.database
        });
        this.tableMap.set('YouTubeComments', youtubeCommentsTable.table);

        const customIngestionTable = new CustomDataTable(this, 'CustomIngestion', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('CustomIngestion')!}/`,
            tableName: props.tablePrefixMappings.get('CustomIngestion')!,
            database: this.database
        });
        this.tableMap.set('CustomIngestion', customIngestionTable.table);

        const customIngestionLoudnessTable = new LoudnessScoreTable(this, 'CustomIngestionLoudness', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('CustomIngestionLoudness')!}/`,
            tableName: props.tablePrefixMappings.get('CustomIngestionLoudness')!,
            database: this.database
        });
        this.tableMap.set('CustomIngestionLoudness', customIngestionLoudnessTable.table);

        const customIngestionItemTable = new ItemTable(this, 'CustomIngestionItem', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('CustomIngestionItem')!}/`,
            tableName: props.tablePrefixMappings.get('CustomIngestionItem')!,
            database: this.database
        });
        this.tableMap.set('CustomIngestionItem', customIngestionItemTable.table);

        const metadataTable = new MetdataTable(this, 'Metadata', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('Metadata')!}/`,
            tableName: props.tablePrefixMappings.get('Metadata')!,
            database: this.database
        });
        this.tableMap.set('Metadata', metadataTable.table);

        const redditCommentsTable = new RedditCommentsTable(this, 'RedditComments', {
            s3InputDataBucket: props.s3InputDataBucket,
            s3BucketPrefix: `${props.tablePrefixMappings.get('RedditComments')!}/`,
            tableName: props.tablePrefixMappings.get('RedditComments')!,
            database: this.database
        });
        this.tableMap.set('RedditComments', redditCommentsTable.table);
    }
}
