/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template, Match } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { CustomIngestion } from '../lib/ingestion/custom-ingestion';

test('Test custom ingestion nested stack', () => {
    const stack = new cdk.Stack();
    const _eventBus = new events.EventBus(stack, 'Bus');
    const s3AccessLoggingBucket = new s3.Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true
    });

    const _s3EventIntegration = new CustomIngestion(stack, 'testS3Event', {
        parameters: {
            'EventBus': _eventBus.eventBusArn,
            'StreamARN': new kinesis.Stream(stack, 'Stream', {}).streamArn
        }
    });
        Template.fromStack(stack).hasResource('AWS::CloudFormation::Stack',
        {
            Type: 'AWS::CloudFormation::Stack',
            Properties: {
                TemplateURL: {},
                Parameters: {
                    EventBus: {
                        'Fn::GetAtt': Match.anyValue()
                    },
                    StreamARN: {
                        'Fn::GetAtt': Match.anyValue()
                    }
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });
});
