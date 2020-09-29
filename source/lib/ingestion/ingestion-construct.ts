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


import { Construct, Duration, Aws } from '@aws-cdk/core';
import { Runtime, Code } from '@aws-cdk/aws-lambda';
import { FeedProducer } from './feed-producer-construct';
import { FeedConsumer } from './feed-consumer-construct';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';

export interface IngestionProps {
    readonly stateMachineArn: string,
    readonly solutionName: string,
    readonly ingestFrequency: string,
    readonly queryParameter: string,
    readonly supportedLang: string //comma separated values of language codes
    readonly credentialKeyPath: string
}

export class Ingestion extends Construct {
    constructor(scope: Construct, id: string, props: IngestionProps) {
        super(scope, id);

        // start creation of Kinesis consumer that invokes state machine
        const invokeStepFunctionPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [ props.stateMachineArn ],
            actions: ['states:StartExecution']
        });

        const feedConsumerlambda = new FeedConsumer(this, 'FeedConsumer', {
            environment: {
                WORKFLOW_ARN: props.stateMachineArn,
            },
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(`${__dirname}/../../lambda/ingestion-consumer`),
            timeout: Duration.minutes(5)
        });

        feedConsumerlambda.lambdaFunction.addToRolePolicy(invokeStepFunctionPolicy);
        // end creation of Kinesis consumer that invokes state machine


        // start creation of Lambda Kinesis producer that fetches social media feed
        new FeedProducer(this, 'FeedProducerConstruct', {
            timeout: Duration.minutes(5),
            stream: feedConsumerlambda.kinesisStream,
            runtime: Runtime.NODEJS_12_X,
            code: Code.fromAsset(`${__dirname}/../../lambda/ingestion-producer`),
            solutionName: props.solutionName,
            supportedLang: props.supportedLang,
            ingestFrequency: props.ingestFrequency,
            queryParameter: props.queryParameter,
            credentialKeyPath: props.credentialKeyPath
        });
        // end creation of Lambda Kinesis producer that fetches social media feed
    }
}
