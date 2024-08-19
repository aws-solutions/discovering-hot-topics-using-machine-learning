/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { App, Stack } from 'aws-cdk-lib';
import { AppIntegration } from '../lib/integration/app-integration-construct';

test('test App Integration Construct', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack', {
        stackName: 'testStack'
    });
    const tableMappings: Map<string, string> = new Map();
    tableMappings.set('Sentiment', 'sentiment');
    tableMappings.set('Entity', 'entity');
    tableMappings.set('KeyPhrase', 'keyphrase');
    tableMappings.set('Topics', 'topics');
    tableMappings.set('TopicMappings', 'topic-mappings');
    tableMappings.set('TxtInImgEntity', 'txtinimgentity');
    tableMappings.set('TxtInImgSentiment', 'txtinimgsentiment');
    tableMappings.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
    tableMappings.set('ModerationLabels', 'moderationlabels');
    tableMappings.set('NewsFeedStorage', 'newsfeedstorage');
    tableMappings.set('TwFeedStorage', 'twfeedstorage');
    tableMappings.set('CustomIngestion', 'customingestion');
    tableMappings.set('YouTubeComments', 'youtubecomments');
    tableMappings.set('CustomIngestionLoudness', 'customingestionloudness');
    tableMappings.set('CustomIngestionItem', 'customingestionitem');
    tableMappings.set('Metadata', 'metadata');
    tableMappings.set('RedditComments', 'redditcomments');

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        publicReadAccess: false,
        enforceSSL: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new AppIntegration(stack, 'Integration', {
        textAnalysisInfNS: 'com.test',
        topicsAnalysisInfNS: 'com.topic',
        topicMappingsInfNS: 'com.topic.mappings',
        metadataNS: 'metadata.call_analytics',
        tableMappings: tableMappings,
        s3LoggingBucket: s3AccessLoggingBucket
    });

});
