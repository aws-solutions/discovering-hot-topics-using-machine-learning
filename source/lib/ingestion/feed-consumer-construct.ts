#!/usr/bin/env node
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


import { Construct, Duration } from '@aws-cdk/core';
import { Runtime, StartingPosition, Code, IFunction } from '@aws-cdk/aws-lambda';
import { StreamEncryption, Stream, IStream } from '@aws-cdk/aws-kinesis';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources';


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
    private consumerFunction: IFunction;

    constructor(scope: Construct, id: string, props: FeedConsumerProps) {
        super(scope, id);

        this.feedConsumerStream = new Stream (this, 'InferenceStreamToWF', {
            encryption: StreamEncryption.MANAGED,
            retentionPeriod: props.retentionPeriod,
            shardCount: props.shardCount
        });

        this.consumerFunction = buildLambdaFunction(this, {
            lambdaFunctionProps: {
                runtime: props.runtime,
                handler: 'index.handler',
                code: props.code,
                timeout: Duration.minutes(5),
                environment: props.environment,
                events: [ new KinesisEventSource(this.feedConsumerStream, {
                        startingPosition: StartingPosition.TRIM_HORIZON,
                        batchSize: props.batchSize,
                        retryAttempts: props.retryAttempts
                    }
                )]
            }
        });
    }

    public get lambdaFunction(): IFunction {
        return this.consumerFunction;
    }

    public get kinesisStream(): IStream {
        return this.feedConsumerStream;
    }
}
