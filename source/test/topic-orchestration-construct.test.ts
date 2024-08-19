/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Stack } from 'aws-cdk-lib';
import { TopicOrchestration } from '../lib/topic-analysis-workflow/topic-orchestration-construct';

test('test Text Analysis Fireshose Stream Creation', () => {
    const stack = new Stack();

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new TopicOrchestration(stack, 'TestTopicOrchestration', {
        ingestionWindow: '2',
        numberofTopics: '10',
        rawBucket: new Bucket(stack, 'RawBucket'),
        platformTypes: [
            {
                name: 'TWITTER',
                topicModelling: true
            }
        ],
        eventBus: new EventBus(stack, 'EventBus'),
        topicsAnalaysisNameSpace: 'com.test.topic',
        topicMappingsNameSpace: 'com.test.mappings',
        topicSchedule: '(5 */2 * * ? *)',
        s3LoggingBucket: s3AccessLoggingBucket
    });
    });
