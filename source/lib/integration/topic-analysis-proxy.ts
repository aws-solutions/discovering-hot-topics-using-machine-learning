#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { Aws, Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
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
                runtime: Runtime.PYTHON_3_11,
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