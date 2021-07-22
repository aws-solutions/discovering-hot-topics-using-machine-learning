#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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


import * as iam from '@aws-cdk/aws-iam';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import { SqsDlq } from '@aws-cdk/aws-lambda-event-sources';
import * as cdk from '@aws-cdk/core';
import { KinesisStreamsToLambda } from '@aws-solutions-constructs/aws-kinesisstreams-lambda';
import * as defaults from '@aws-solutions-constructs/core';
export interface FeedConsumerProps {
    readonly functionProps: lambda.FunctionProps;
    readonly batchSize?: number;
    readonly retryAttempts?: number;
    readonly shardCount?: number;
    readonly retentionPeriod?: cdk.Duration;
}

export class FeedConsumer extends cdk.Construct {

    private readonly feedConsumerStream: kinesis.IStream;
    private _consumerFunction: lambda.Function;

    constructor(scope: cdk.Construct, id: string, props: FeedConsumerProps) {
        super(scope, id);

        const [sqsQueue] = defaults.buildQueue(this, 'SqsDlqQueue', {});

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
