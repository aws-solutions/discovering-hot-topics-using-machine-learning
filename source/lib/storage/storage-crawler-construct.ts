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

import { Schedule } from "@aws-cdk/aws-events";
import { Effect, Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket } from "@aws-cdk/aws-s3";
import { Aws, Construct, CustomResource, Duration } from "@aws-cdk/core";
import { EventsRuleToLambda } from '@aws-solutions-constructs/aws-events-rule-lambda';
import { buildLambdaFunction } from "@aws-solutions-constructs/core";

export interface StorageCrawlerProps {
    readonly s3Bucket: Bucket,
    readonly databaseName: string,
    readonly keyArn: string,
    readonly tableMap: Map<string, string>
}

export class StorageCrawler extends Construct {
    constructor(scope: Construct, id: string, props: StorageCrawlerProps) {
        super(scope, id);

        const lambdaGluePolicy = new Policy(this, 'LambdaGlue', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [
                        `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${props.databaseName}/*`,
                        `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${props.databaseName}`,
                        `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`,
                    ],
                    actions: [
                        'glue:GetPartition', 'glue:GetTable', 'glue:CreatePartition'
                    ]
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ props.keyArn ],
                    actions: [ 'kms:Decrypt' ]
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [ 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents' ],
                    resources: [ `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:/aws-glue/*` ]
                })
            ]
        });

        const lambdaFunc = buildLambdaFunction(this, {
            lambdaFunctionProps: {
                description: 'Lambda function to create parition on glue tables',
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/create-partition`),
                timeout: Duration.minutes(5),
                environment: {
                    DATABASE_NAME: props.databaseName,
                    TABLE_NAMES: Array.from(props.tableMap.values()).join(',')
                }
            }
        });

        const createParitionLambda = new EventsRuleToLambda(this, 'NightlyCreateParition', {
            existingLambdaObj: lambdaFunc,
            eventRuleProps: {
                schedule: Schedule.expression("cron(1 0 * * ? *)")
            }
        });

        props.s3Bucket.grantReadWrite(createParitionLambda.lambdaFunction.role!);
        lambdaGluePolicy.attachToRole(createParitionLambda.lambdaFunction.role!);

        const createPartitionCustomResource = new CustomResource(this, 'CustomResource', {
            serviceToken: lambdaFunc.functionArn,
            resourceType: 'Custom::CreatePartition'
        });

        createParitionLambda.lambdaFunction.node.addDependency(lambdaGluePolicy);
    }
}