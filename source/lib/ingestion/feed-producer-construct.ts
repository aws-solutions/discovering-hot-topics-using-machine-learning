#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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

import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';

export interface FeedProducerProps {
    readonly functionProps: FunctionProps;
    readonly stream: IStream;
    readonly ingestFrequency: string;
    readonly credentialKeyPath: string;
}

export class FeedProducer extends Construct {

    private readonly producerFn: Function;

    constructor(scope: Construct, id: string, props: FeedProducerProps) {
        super(scope, id);

        const lambdaSSMPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [ `arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter${props.credentialKeyPath}` ],
            actions: [ 'ssm:GetParameter', 'ssm:PutParameter' ]
        });

        const dynamoDBTable = new LambdaToDynamoDB(this, 'LambdaDDB', {
            lambdaFunctionProps: props.functionProps,
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
