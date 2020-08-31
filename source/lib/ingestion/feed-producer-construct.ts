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
import { Runtime, Code, Function}  from '@aws-cdk/aws-lambda';
import { PolicyStatement, Role, Effect } from '@aws-cdk/aws-iam';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { AttributeType } from '@aws-cdk/aws-dynamodb';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { IStream } from '@aws-cdk/aws-kinesis';

export interface FeedProducerProps {
    readonly timeout: Duration,
    readonly stream: IStream,
    readonly runtime: Runtime,
    readonly code: Code,
    readonly solutionName: string,
    readonly stackName: string,
    readonly supportedLang: string,
    readonly ingestFrequency: string,
    readonly queryParameter: string,
    readonly credentialKeyPath: string
}

export class FeedProducer extends Construct {

    private readonly producerFn: Function;

    constructor(scope: Construct, id: string, props: FeedProducerProps) {
        super(scope, id);

        const lambdaSSMPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [`arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/${props.solutionName}/${props.stackName}/*`],
            actions: [ "ssm:GetParameter", "ssm:PutParameter" ]
        });

        const dynamoDBTable = new LambdaToDynamoDB(this, 'LambdaDDB', {
            lambdaFunctionProps: {
                runtime: props.runtime,
                handler: 'index.handler',
                code: props.code,
                timeout: props.timeout,
                environment: {
                    SOLUTION_NAME: props.solutionName,
                    STACK_NAME: props.stackName,
                    STREAM_NAME: props.stream.streamName,
                    SUPPORTED_LANG: props.supportedLang,
                    QUERY_PARAM: props.queryParameter,
                    CREDENTIAL_KEY_PATH: props.credentialKeyPath
                }
            },
            dynamoTableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: AttributeType.STRING
                },
                sortKey: {
                    name: "CREATED_TIMESTAMP",
                    type: AttributeType.STRING
                },
                timeToLiveAttribute: "EXP_DATE"
            }
        });

        props.stream.grantWrite(dynamoDBTable.lambdaFunction.role as Role)
        dynamoDBTable.lambdaFunction.addToRolePolicy(lambdaSSMPolicy);

        const rule = new Rule(this, 'PollFrequency', {
            schedule: Schedule.expression(`${props.ingestFrequency}`)
        });

        rule.addTarget(new LambdaFunction(dynamoDBTable.lambdaFunction));
        this.producerFn = dynamoDBTable.lambdaFunction;
    }

    public get producerFunction(): Function {
        return this.producerFn;
    }
}