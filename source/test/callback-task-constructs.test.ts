/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { StepFuncCallbackTask } from '../lib/text-analysis-workflow/callback-task-construct';

test('test statemachine fragment creation', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const _sqsTask = new StepFuncCallbackTask(stack, 'testFragment', {
        lambdaFunctionProps: {
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/wf-analyze-text'),
            runtime: lambda.Runtime.NODEJS_20_X
        }
    });
});

test('test by passing state machine', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const _sqsTask = new StepFuncCallbackTask(stack, 'testFragment', {
        lambdaFunctionProps: {
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/wf-analyze-text'),
            runtime: lambda.Runtime.NODEJS_20_X
        },
        stateMachine: new sfn.StateMachine(stack, 'testStateMachine', {
            definitionBody: sfn.DefinitionBody.fromChainable(new sfn.Pass(stack, 'Pass'))
        })
    });
});
