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


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as cdk from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';

export interface StepFuncLambdaTaskProps {
    readonly taskName: string,
    readonly lambdaFunctionProps: lambda.FunctionProps,
    readonly inputPath?: string | any,
    readonly outputPath?: string | any
}

export class StepFuncLambdaTask extends cdk.Construct {

    private executeTask: tasks.LambdaInvoke;

    private lambdaFn: lambda.Function;

    constructor (scope: cdk.Construct, id: string, props: StepFuncLambdaTaskProps) {
        super(scope, id);

        this.lambdaFn = defaults.buildLambdaFunction(this, {
            lambdaFunctionProps: props.lambdaFunctionProps,
        });

        this.executeTask = new tasks.LambdaInvoke(this, props.taskName, {
            lambdaFunction: this.lambdaFn,
            inputPath: props.inputPath,
            outputPath: props.outputPath,
            heartbeat: cdk.Duration.minutes(15),
            retryOnServiceExceptions: true,
        });

        const _failedState = new sfn.Fail(this, `${id}TaskFailed`, {
            cause: sfn.JsonPath.stringAt('$.cause')
        });

        this.executeTask.addCatch(_failedState);
    }

    public get stepFunctionTask(): tasks.LambdaInvoke {
        return this.executeTask;
    }

    public get lambdaFunction(): lambda.Function {
        return this.lambdaFn;
    }
}
