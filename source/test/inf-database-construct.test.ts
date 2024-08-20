/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { InferenceDatabase } from '../lib/visualization/inf-database-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();

    const storageConfig: Map<string, string> = new Map();
    storageConfig.set('Sentiment', 'sentiment');
    storageConfig.set('Entity', 'entity');
    storageConfig.set('Entity', 'entity');
    storageConfig.set('KeyPhrase', 'keyphrase');
    storageConfig.set('Topics', 'topics');
    storageConfig.set('TopicMappings', 'topic-mappings');
    storageConfig.set('TxtInImgEntity', 'txtinimgentity');
    storageConfig.set('TxtInImgSentiment', 'txtinimgsentiment');
    storageConfig.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
    storageConfig.set('NewsFeedStorage', 'newsfeedstorage');
    storageConfig.set('ModerationLabels', 'moderationlabels');
    storageConfig.set('YouTubeComments', 'youtubecomments');
    storageConfig.set('CustomIngestion', 'customingestion');

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true
    });

    new InferenceDatabase(stack, 'TestDB', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        tablePrefixMappings: storageConfig,
        s3LoggingBucket: s3AccessLoggingBucket
    });
});
