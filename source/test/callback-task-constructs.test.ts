/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { StepFuncCallbackTask } from '../lib/text-analysis-workflow/callback-task-construct';

test('test statemachine fragment creation', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const _sqsTask = new StepFuncCallbackTask (stack, 'testFragment', {
        lambdaFunctionProps: {
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/wf-analyze-text'),
            runtime: lambda.Runtime.NODEJS_14_X
        },
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test by passing state machine', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const _sqsTask = new StepFuncCallbackTask (stack, 'testFragment', {
        lambdaFunctionProps: {
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/wf-analyze-text'),
            runtime: lambda.Runtime.NODEJS_14_X
        },
        stateMachine: new sfn.StateMachine(stack, 'testStateMachine', {
            definition: new sfn.Pass(stack, 'Pass')
        })
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});