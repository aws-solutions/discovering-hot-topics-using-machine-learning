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
import { EventBus } from '@aws-cdk/aws-events';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from '@aws-cdk/aws-s3';
import { Stack } from '@aws-cdk/core';
import { TopicOrchestration } from '../lib/topic-analysis-workflow/topic-orchestration-construct';



test('test Text Analysis Fireshose Stream Creation', () => {
    const stack = new Stack();

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new TopicOrchestration(stack, 'TestTopicOrchestration', {
        ingestionWindow: '2',
        numberofTopics: '10',
        rawBucket: new Bucket(stack, 'RawBucket'),
        eventBus: new EventBus(stack, 'EventBus'),
        topicsAnalaysisNameSpace: 'com.test.topic',
        topicMappingsNameSpace: 'com.test.mappings',
        topicSchedule: '(5 */2 * * ? *)',
        s3LoggingBucket: s3AccessLoggingBucket
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});