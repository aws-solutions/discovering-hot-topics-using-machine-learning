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
