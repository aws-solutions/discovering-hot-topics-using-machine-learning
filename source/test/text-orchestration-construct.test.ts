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
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { TextOrchestration } from '../lib/text-analysis-workflow/text-orchestration-construct';


test('test orchestration construct', () => {
    const stack = new cdk.Stack();

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new TextOrchestration (stack, 'OrchestrationConstruct', {
        eventBus: new EventBus(stack, 'TestEventBus'),
        textAnalysisNameSpace: 'com.test.text',
        s3LoggingBucket: s3AccessLoggingBucket,
        lambdaTriggerFunc: new Function(stack, 'testFunction', {
            runtime: Runtime.PYTHON_3_8,
            code: Code.fromAsset(`${__dirname}/../lambda/ingestion-consumer/`),
            handler: 'index.handler'
        })
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
        "PolicyDocument": {
            "Statement": [{
                "Action": "states:StartExecution",
                "Effect": "Allow",
            }]
        }
    });
});