#!/usr/bin/env node
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


import { IStream, StreamEncryption } from '@aws-cdk/aws-kinesis';
import { Code, Function, Runtime, StartingPosition } from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { KinesisStreamsToLambda } from '@aws-solutions-constructs/aws-kinesisstreams-lambda';
export interface FeedConsumerProps {
    readonly environment?: { [key: string]: string }
    readonly timeout: Duration,
    readonly runtime: Runtime,
    readonly code: Code,
    readonly batchSize?: number,
    readonly retryAttempts?: number,
    readonly shardCount?: number,
    readonly retentionPeriod?: Duration
}

export class FeedConsumer extends Construct {

    private readonly feedConsumerStream: IStream;
    private _consumerFunction: Function;

    constructor(scope: Construct, id: string, props: FeedConsumerProps) {
        super(scope, id);

        const ingestionStream = new KinesisStreamsToLambda(this, 'IngestionStream', {
            lambdaFunctionProps: {
                runtime: props.runtime,
                handler: 'index.handler',
                code: props.code,
                timeout: Duration.minutes(5),
                environment: props.environment
            },
            kinesisStreamProps: {
                encryption: StreamEncryption.MANAGED,
                retentionPeriod: props.retentionPeriod,
                shardCount: props.shardCount
            },
            kinesisEventSourceProps: {
                startingPosition: StartingPosition.TRIM_HORIZON,
                batchSize: props.batchSize,
                retryAttempts: props.retryAttempts
            }
        });

        this._consumerFunction = ingestionStream.lambdaFunction;
        this.feedConsumerStream = ingestionStream.kinesisStream;
    }

    public get lambdaFunction(): Function {
        return this._consumerFunction;
    }

    public get kinesisStream(): IStream {
        return this.feedConsumerStream;
    }
}
