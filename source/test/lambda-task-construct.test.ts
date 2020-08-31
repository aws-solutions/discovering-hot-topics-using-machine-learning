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

import { SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { StepFuncLambdaTask } from '../lib/text-analysis-workflow/lambda-task-construct';

import '@aws-cdk/assert/jest';

test('test lambda task construct', () => {
    const stack = new cdk.Stack();

    new  StepFuncLambdaTask (stack, 'StepFuncWorkflowStack', {
        taskName: 'unitTestTask',
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/../lambda/wf-analyze-text`)
        },
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});