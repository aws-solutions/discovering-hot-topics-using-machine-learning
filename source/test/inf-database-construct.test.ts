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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
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


    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new InferenceDatabase(stack, 'TestDB', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        tablePrefixMappings: storageConfig,
        s3LoggingBucket: s3AccessLoggingBucket
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});