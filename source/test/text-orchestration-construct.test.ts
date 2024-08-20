/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { TextOrchestration } from '../lib/text-analysis-workflow/text-orchestration-construct';

test('test orchestration construct', () => {
    const stack = new cdk.Stack();

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new TextOrchestration(stack, 'OrchestrationConstruct', {
        eventBus: new EventBus(stack, 'TestEventBus'),
        textAnalysisNameSpace: 'com.test.text',
        s3LoggingBucket: s3AccessLoggingBucket,
        lambdaTriggerFunc: new Function(stack, 'testFunction', {
            runtime: Runtime.PYTHON_3_11,
            code: Code.fromAsset('lambda/wf-extract-text-in-image'),
            handler: 'index.handler'
        }),
        platformTypes: [
            {
                name: 'TWITTER',
                topicModelling: true
            },
            {
                name: 'NEWSFEEDS',
                topicModelling: true
            }
        ]
    });

    
    Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
        'PolicyDocument': {
            'Statement': [
                {
                    'Action': 'states:StartExecution',
                    'Effect': 'Allow'
                }
            ]
        }
    });
});
