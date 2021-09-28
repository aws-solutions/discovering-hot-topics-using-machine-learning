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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from '@aws-cdk/aws-s3';
import { App, Stack } from '@aws-cdk/core';
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
    tableMappings.set('TopicMappings','topic-mappings');
    tableMappings.set('TxtInImgEntity', 'txtinimgentity');
    tableMappings.set('TxtInImgSentiment', 'txtinimgsentiment');
    tableMappings.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
    tableMappings.set('ModerationLabels', 'moderationlabels');
    tableMappings.set('NewsFeedStorage', 'newsfeedstorage');
    tableMappings.set('TwFeedStorage', 'twfeedstorage');
    tableMappings.set('YouTubeComments', 'youtubecomments');

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new AppIntegration(stack, 'Integration', {
        textAnalysisInfNS: 'com.test',
        topicsAnalysisInfNS: 'com.topic',
        topicMappingsInfNS: 'com.topic.mappings',
        tableMappings: tableMappings,
        s3LoggingBucket: s3AccessLoggingBucket
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
