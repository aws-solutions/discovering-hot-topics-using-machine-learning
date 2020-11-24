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


import { Function, FunctionProps } from '@aws-cdk/aws-lambda';
import { Task } from '@aws-cdk/aws-stepfunctions';
import { InvokeFunction } from '@aws-cdk/aws-stepfunctions-tasks';
import { Construct } from '@aws-cdk/core';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';

export interface StepFuncLambdaTaskProps {
    readonly taskName: string,
    readonly lambdaFunctionProps: FunctionProps,
    readonly inputPath?: string | any,
    readonly outputPath?: string | any
}

export class StepFuncLambdaTask extends Construct {

    private executeTask: Task;

    private lambdaFn: Function;

    constructor (scope: Construct, id: string, props: StepFuncLambdaTaskProps) {
        super(scope, id);

        this.lambdaFn = buildLambdaFunction(this, {
            lambdaFunctionProps: props.lambdaFunctionProps,
        });

        this.executeTask = new Task(this, props.taskName, {
            task: new InvokeFunction(this.lambdaFn),
            inputPath: props.inputPath,
            outputPath: props.outputPath
        });
    }

    public get stepFunctionTask(): Task {
        return this.executeTask;
    }

    public get lambdaFunction(): Function {
        return this.lambdaFn;
    }
}