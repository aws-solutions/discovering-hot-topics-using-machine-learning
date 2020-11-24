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


import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Construct, Duration } from '@aws-cdk/core';
import { FeedConsumer } from './feed-consumer-construct';
import { FeedProducer } from './feed-producer-construct';

export interface IngestionProps {
    readonly solutionName: string,
    readonly ingestFrequency: string,
    readonly queryParameter: string,
    readonly supportedLang: string //comma separated values of language codes
    readonly credentialKeyPath: string
}

export class Ingestion extends Construct {
    private readonly _producerLambdaFunction: Function;
    private readonly _consumerLambdaFunction: Function;

    constructor(scope: Construct, id: string, props: IngestionProps) {
        super(scope, id);

        const feedConsumerlambda = new FeedConsumer(this, 'FeedConsumer', {
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(`${__dirname}/../../lambda/ingestion-consumer`),
            timeout: Duration.minutes(5),
            batchSize: 5,
            shardCount: 1
        });

        this._consumerLambdaFunction = feedConsumerlambda.lambdaFunction;

        // start creation of Lambda Kinesis producer that fetches social media feed
        this._producerLambdaFunction =  new FeedProducer(this, 'FeedProducerConstruct', {
            timeout: Duration.minutes(5),
            stream: feedConsumerlambda.kinesisStream,
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(`${__dirname}/../../lambda/ingestion-producer`),
            solutionName: props.solutionName,
            supportedLang: props.supportedLang,
            ingestFrequency: props.ingestFrequency,
            queryParameter: props.queryParameter,
            credentialKeyPath: props.credentialKeyPath
        }).producerFunction;
        // end creation of Lambda Kinesis producer that fetches social media feed
    }

    public get producerLambdaFunc(): Function {
        return this._producerLambdaFunction;
    }

    public get consumerLambdaFunc(): Function {
        return this._consumerLambdaFunction;
    }
}
