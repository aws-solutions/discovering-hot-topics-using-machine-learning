/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { Stack } from 'aws-cdk-lib';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Config, EventRule } from '../lib/integration/event-rule-construct';

test('test Event Rule Construct', () => {
    const stack = new Stack();

    const proxylambda = buildLambdaFunction(stack, {
        lambdaFunctionProps: {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(`${__dirname}/../lambda/integration`),
            environment: {
                STREAM_NAME: 'test-stream'
            }
        }
    });

    const configs: Config[] = [
        {
            source: ['com.test'],
            ruleTargets: [new LambdaFunction(proxylambda)]
        }
    ];

    new EventRule(stack, 'EventRule', {
        configs: configs
    });
});
