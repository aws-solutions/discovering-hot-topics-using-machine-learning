#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cdk from 'aws-cdk-lib';
import { KinesisStreamsToLambda } from '@aws-solutions-constructs/aws-kinesisstreams-lambda';
import * as defaults from '@aws-solutions-constructs/core';

export interface FeedConsumerProps {
    readonly functionProps: lambda.FunctionProps;
    readonly batchSize?: number;
    readonly retryAttempts?: number;
    readonly shardCount?: number;
    readonly retentionPeriod?: cdk.Duration;
}

export class FeedConsumer extends Construct {

    private readonly feedConsumerStream: kinesis.IStream;
    private _consumerFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: FeedConsumerProps) {
        super(scope, id);

        const sqsQueue = defaults.buildQueue(this, 'SqsDlqQueue', {}).queue;

        const ingestionStream = new KinesisStreamsToLambda(this, 'IngestionStream', {
            lambdaFunctionProps: props.functionProps,
            kinesisStreamProps: {
                encryption: kinesis.StreamEncryption.MANAGED,
                retentionPeriod: props.retentionPeriod,
                shardCount: props.shardCount
            },
            kinesisEventSourceProps: {
                startingPosition: lambda.StartingPosition.TRIM_HORIZON,
                batchSize: props.batchSize,
                retryAttempts: props.retryAttempts,
                onFailure: new SqsDlq(sqsQueue)
            }
        });

        this._consumerFunction = ingestionStream.lambdaFunction;
        this.feedConsumerStream = ingestionStream.kinesisStream;

        // This dependency mapping is required because the lambda role policy is getting created before the SQS DLQ. Since the DLQ
        // does not exist the policy creation failes in CFN.
        (this._consumerFunction.role?.node.tryFindChild('DefaultPolicy') as iam.Policy).node.addDependency(sqsQueue);
    }

    public get lambdaFunction(): lambda.Function {
        return this._consumerFunction;
    }

    public get kinesisStream(): kinesis.IStream {
        return this.feedConsumerStream;
    }
}
