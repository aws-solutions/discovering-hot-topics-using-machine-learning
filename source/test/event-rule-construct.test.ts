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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { Code, Runtime } from '@aws-cdk/aws-lambda';
import { Stack } from '@aws-cdk/core';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import { Config, EventRule } from '../lib/integration/event-rule-construct';


test('test Event Rule Construct', () => {
    const stack = new Stack();

    const proxylambda = buildLambdaFunction(stack,  {
        lambdaFunctionProps: {
            runtime: Runtime.NODEJS_12_X,
            handler: 'index.handler',
            code: Code.fromAsset(`${__dirname}/../lambda/integration`),
            environment: {
                STREAM_NAME: 'test-stream'
            }
        }
    });

    const configs: Config[] = [{
        source: [ 'com.test' ],
        ruleTargets: [
            new LambdaFunction(proxylambda),
        ]
    }];

    new EventRule(stack, 'EventRule', {
        configs: configs
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
