/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/


import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export interface StepFuncLambdaTaskProps {
    readonly taskName: string,
    readonly lambdaFunctionProps: lambda.FunctionProps,
    readonly inputPath?: string | any,
    readonly outputPath?: string | any
}

export class StepFuncLambdaTask extends Construct {

    private executeTask: tasks.LambdaInvoke;

    private lambdaFn: lambda.Function;

    constructor (scope: Construct, id: string, props: StepFuncLambdaTaskProps) {
        super(scope, id);

        this.lambdaFn = defaults.buildLambdaFunction(this, {
            lambdaFunctionProps: props.lambdaFunctionProps,
        });

        this.executeTask = new tasks.LambdaInvoke(this, props.taskName, {
            lambdaFunction: this.lambdaFn,
            inputPath: props.inputPath,
            outputPath: props.outputPath,
            heartbeatTimeout: sfn.Timeout.duration(cdk.Duration.minutes(15)),
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
