#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as defaults from '@aws-solutions-constructs/core';
import { Duration } from 'aws-cdk-lib';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface S3ToEventBridgeToLambdaProps {
    /**
     * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
     *
     * @default - None
     */
    readonly existingBucketObj?: s3.IBucket;
    /**
     * Optional user provided props to override the default props for the S3 Bucket.
     *
     * @default - Default props are used
     */
    readonly bucketProps?: s3.BucketProps;
    /**
     * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function;
    /**
     * User provided props to override the default props for the Lambda function.
     *
     * @default - Default props are used
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps;
    /**
     * Optional user provided eventRuleProps to override the defaults
     *
     * @default - None
     */
    readonly eventRuleProps?: events.RuleProps;
    /**
     * Optional user provided props to override the default props for the S3 Logging Bucket.
     *
     * @default - Default props are used
     */
    readonly s3LoggingBucket?: s3.IBucket;
}

export class S3ToEventBridgeToLambda extends Construct {
    public readonly s3Bucket: s3.Bucket;
    public readonly cloudTrailBucket?: s3.IBucket;
    public readonly s3LoggingBucket?: s3.IBucket;
    public readonly lambdaFunction: lambda.Function;
    public readonly eventsRule: events.Rule;
    public readonly cloudTrail: cloudtrail.Trail;

    /**
     * Construct the new instance of S3ToEventBridgeToLambda
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param props - user provided props for the construct
     */
    constructor(scope: Construct, id: string, props: S3ToEventBridgeToLambdaProps) {
        super(scope, id);
        defaults.CheckS3Props(props);

        let bucket: s3.IBucket;

        if (!props.existingBucketObj) {
            const buildS3 = defaults.buildS3Bucket(this, {
                bucketProps: {
                    ...props.bucketProps,
                    serverAccessLogsBucket: props.s3LoggingBucket,
                    serverAccessLogsPrefix: `${id}/`
                }
            });

            [this.s3Bucket, this.s3LoggingBucket] = [buildS3.bucket, buildS3.loggingBucket];
            bucket = this.s3Bucket;
        } else {
            bucket = props.existingBucketObj;
        }

        const cfnS3Bucket = bucket.node.defaultChild as s3.CfnBucket;
        cfnS3Bucket.notificationConfiguration = {
            eventBridgeConfiguration: {
                eventBridgeEnabled: true
            }
        };

        if (props.s3LoggingBucket != undefined) {
            this.s3LoggingBucket = props.s3LoggingBucket;
        }

        let _eventRuleProps: events.RuleProps = {};
        if (props.eventRuleProps) {
            _eventRuleProps = props.eventRuleProps;
        } else {
            // By default the CW Events Rule will filter any 's3:PutObject' events for the S3 Bucket
            _eventRuleProps = {
                eventPattern: {
                    source: ['aws.s3'],
                    detailType: ['Object Created']
                }
            };
        }

        // create a dead-letter queue
        const _dlq = new sqs.Queue(this, 'DLQ', {
            encryption: sqs.QueueEncryption.KMS_MANAGED, 
            enforceSSL: true
        });
        NagSuppressions.addResourceSuppressions(_dlq, [
            { id: 'AwsSolutions-SQS3', reason: "This SQS queue is used as a destination to store events that couldn't successfully be delivered to the target" }
        ]);

        let _lambdaFunc = defaults.buildLambdaFunction(this, {
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        const _rule = new events.Rule(this, 'S3NotificatonRule', _eventRuleProps);
        _rule.addTarget(
            new targets.LambdaFunction(_lambdaFunc, {
                deadLetterQueue: _dlq,
                maxEventAge: Duration.days(1),
                retryAttempts: 10
            })
        );

        _lambdaFunc.addPermission('EventBusInvokeLambda', {
            principal: new iam.ServicePrincipal('events.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: _rule.ruleArn
        });

        bucket.grantRead(_lambdaFunc.role!);

        this.eventsRule = _rule;
        this.lambdaFunction = _lambdaFunc;
    }
}
