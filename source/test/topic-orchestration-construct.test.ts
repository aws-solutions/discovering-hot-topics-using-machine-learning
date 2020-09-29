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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack, CfnParameter } from '@aws-cdk/core'
import '@aws-cdk/assert/jest';

import { TopicOrchestration } from '../lib/topic-analysis-workflow/topic-orchestration-construct';
import { Bucket } from '@aws-cdk/aws-s3';
import { EventBus } from '@aws-cdk/aws-events';


test('test Text Analysis Fireshose Stream Creation', () => {
    const stack = new Stack();
    new TopicOrchestration(stack, 'TestTopicOrchestration', {
        ingestionWindow: '2',
        numberofTopics: '10',
        rawBucket: new Bucket(stack, 'RawBucket'),
        eventBus: new EventBus(stack, 'EventBus'),
        topicsAnalaysisNameSpace: 'com.test.topic',
        topicMappingsNameSpace: 'com.test.mappings',
        topicSchedule: '(5 */2 * * ? *)'
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});