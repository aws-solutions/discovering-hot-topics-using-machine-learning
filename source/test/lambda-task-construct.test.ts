/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StepFuncLambdaTask } from '../lib/text-analysis-workflow/lambda-task-construct';

test('test lambda task construct', () => {
    const stack = new cdk.Stack();

    new StepFuncLambdaTask(stack, 'StepFuncWorkflowStack', {
        taskName: 'unitTestTask',
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/../lambda/wf-analyze-text`)
        }
    });
});
