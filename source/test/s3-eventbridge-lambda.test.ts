/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { S3ToEventBridgeToLambda } from '../lib/s3-event-notification/s3-eventbridge-lambda';

test('Test default s3-cloudtrail-eventbridge-lambda', () => {
    const stack = new cdk.Stack();

    const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('lambda/ingestion-custom'),
            handler: 'lambda_function/handler'
        }
    });
    });

test('Test when an existing lambda is provided', () => {
    const stack = new cdk.Stack();

    const _lambdaFunc = new lambda.Function(stack, 'testfunction', {
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('lambda/ingestion-custom'),
            handler: 'lambda_function/handler'
    });

    const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
       existingLambdaObj: _lambdaFunc
    });
});

test('Test when an existing bucket is provided', () => {
    const stack = new cdk.Stack();

    const _existingBucket = new s3.Bucket(stack, 'testBucket', {
        bucketName: 'testbucket'
    });

    const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('lambda/ingestion-custom'),
            handler: 'lambda_function/handler'
        },
        existingBucketObj: _existingBucket
    });
        Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
            BucketName: "testbucket"
    });
});

test('Use bucket props to create a bucket', () => {
    const stack = new cdk.Stack();

    const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('lambda/ingestion-custom'),
            handler: 'lambda_function/handler'
        },
        bucketProps: {
            bucketName: 'bucketpropsprovided'
        }
    });
        Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {
            BucketName: "bucketpropsprovided"
    });
});

test('Test when event props are provided', () => {
    const stack = new cdk.Stack();

    const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('lambda/ingestion-custom'),
            handler: 'lambda_function/handler'
        },
        eventRuleProps: {
            eventPattern: {
                source: ['aws.fake.event'],
                detailType: ['Test API Call Event'],
                detail: {
                    eventSource: [
                        'fake.amazonaws.com'
                    ],
                    eventName: [
                        'fakeEvent1',
                        'fakeEvent2'
                    ]
                }
            }
        }
    });

        Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
        EventPattern: {
            source: ['aws.fake.event'],
            'detail-type': ['Test API Call Event'],
            detail: {
                'eventSource': [
                    'fake.amazonaws.com'
                ],
                'eventName': [
                    'fakeEvent1',
                    'fakeEvent2'
                ]
            }
        },
        State: 'ENABLED',
        Targets: Match.anyValue()
    })
});

test('Throw error when specifying bucket instance and bucket props', () => {
    const stack = new cdk.Stack();

    const _existingBucket = new s3.Bucket(stack, 'testBucket', {
        bucketName: 'testbucket'
    });

    try {
        const _s3EventIntegration = new S3ToEventBridgeToLambda(stack, 'testS3Event', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.PYTHON_3_11,
                code: lambda.Code.fromAsset('lambda/ingestion-custom'),
                handler: 'lambda_function/handler'
            },
            bucketProps: {
                bucketName: 'bucketpropsprovided'
            },
            existingBucketObj: _existingBucket
        });
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
    }
});