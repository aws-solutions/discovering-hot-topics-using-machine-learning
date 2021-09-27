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

import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Aws, Construct, Duration } from '@aws-cdk/core';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { EventStorage } from '../storage/event-storage-construct';

export interface TopicAnalysisProxyProps {
    readonly topicsStorage: EventStorage,
    readonly topicMappingsStorage: EventStorage,
    readonly topicsAnalysisInfNS: string,
    readonly topicMappingsInfNS: string
}

export class TopicAnalysisProxy extends Construct {
    private readonly topicAnalysisLamda: Function;

    constructor(scope: Construct, id: string, props: TopicAnalysisProxyProps) {
        super(scope, id);

        this.topicAnalysisLamda = buildLambdaFunction(this, {
            lambdaFunctionProps: {
                runtime: Runtime.PYTHON_3_8,
                handler: 'lambda_function.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/firehose_topic_proxy`
                /* for use with docker image to build dependencies {
                    bundling:{
                        "image": Runtime.PYTHON_3_7.bundlingDockerImage,
                        "command": ["bash", "-c", "ls /asset-input /asset-output && pip install -r requirements.txt -t /asset-output && ls /asset-output && rsync -r . /asset-output"]
                    }
                }*/),
                environment: {
                    TOPICS_FIREHOSE: props.topicsStorage.deliveryStreamName,
                    TOPIC_MAPPINGS_FIREHOSE: props.topicMappingsStorage.deliveryStreamName,
                    TOPICS_NS: props.topicsAnalysisInfNS,
                    TOPIC_MAPPINGS_NS: props.topicMappingsInfNS
                },
                memorySize: 256,
                timeout: Duration.minutes(10)
            }
        })

        this.topicAnalysisLamda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
                `arn:${Aws.PARTITION}:firehose:${Aws.REGION}:${Aws.ACCOUNT_ID}:deliverystream/${props.topicsStorage.deliveryStreamName}`,
                `arn:${Aws.PARTITION}:firehose:${Aws.REGION}:${Aws.ACCOUNT_ID}:deliverystream/${props.topicMappingsStorage.deliveryStreamName}`
            ],
            actions: [ 'firehose:PutRecord', 'firehose:PutRecordBatch' ]
        }));
    }

    public get lambdaFunction(): Function {
        return this.topicAnalysisLamda;
    }
}