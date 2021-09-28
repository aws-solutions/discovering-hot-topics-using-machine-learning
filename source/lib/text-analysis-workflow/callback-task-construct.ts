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

import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { SqsEventSourceProps } from '@aws-cdk/aws-lambda-event-sources';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as task from '@aws-cdk/aws-stepfunctions-tasks';
import * as cdk from '@aws-cdk/core';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import * as defaults from '@aws-solutions-constructs/core';

export interface StepFuncCallbackTaskProps {
    /**
     * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * User provided props to override the default props for the Lambda function.
     *
     * @default - Default properties are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps,
    /**
     * Existing instance of SQS queue object, Providing both this and queueProps will cause an error.
     *
     * @default - Default props are used
     */
    readonly existingQueueObj?: sqs.Queue;
    /**
     * Optional user-provided props to override the default props for the SQS queue.
     *
     * @default - Default props are used
     */
    readonly queueProps?: sqs.QueueProps;
    /**
     * Optional user provided properties for the dead letter queue
     *
     * @default - Default props are used
     */
    readonly deadLetterQueueProps?: sqs.QueueProps;
    /**
     * Whether to deploy a secondary queue to be used as a dead letter queue.
     *
     * @default - true.
     */
    readonly deployDeadLetterQueue?: boolean;
    /**
     * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
     *
     * @default - required field if deployDeadLetterQueue=true.
     */
    readonly maxReceiveCount?: number;
    /**
     * Optional user provided properties for the dead letter queue
     *
     * @default - Default props are used
     */
    readonly sqsEventSourceProps?: SqsEventSourceProps
    /**
     * Optional user provided properties to create an SQS based stepfunction task
     *
     * @default - None
     */
    readonly sqsSendMessageProps?: Partial<task.SqsSendMessageProps>;
    /**
     * Optional user provided state machine that the lambda function can sendTaskResponse. This role policy of
     * the lambda function will be restricted to be able to send the response token only to the provided state
     * machine. If the parameter is not supplied, the lambda role policy for sending the task token response
     * will contain '*' in the resources section
     *
     * @default - None
     */
    readonly stateMachine?: sfn.StateMachine;
}

export class StepFuncCallbackTask extends sfn.StateMachineFragment {
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue: sqs.DeadLetterQueue | undefined;
    public readonly lambda: lambda.Function;
    public readonly startState: sfn.State;
    public readonly endStates: sfn.INextable[];

    constructor(scope: cdk.Construct, id: string, props: StepFuncCallbackTaskProps) {
        super(scope, id);

        const _sqsLambda = new SqsToLambda(this, 'Task', {
            lambdaFunctionProps: props.lambdaFunctionProps,
            existingLambdaObj: props.existingLambdaObj,
            queueProps: props.queueProps,
            existingQueueObj: props.existingQueueObj,
            deadLetterQueueProps: props.deadLetterQueueProps,
            deployDeadLetterQueue: props.deployDeadLetterQueue,
            maxReceiveCount: props.maxReceiveCount,
            sqsEventSourceProps: props.sqsEventSourceProps
        });

        const _defaultSqsSendMessageProps: task.SqsSendMessageProps = {
            queue: _sqsLambda.sqsQueue,
            messageBody: sfn.TaskInput.fromObject({
                "input": sfn.JsonPath.stringAt('$'),
                "taskToken": sfn.JsonPath.taskToken
            }),
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            outputPath: "$",
            heartbeat: cdk.Duration.minutes(720),
            timeout: cdk.Duration.minutes(1440)
        };

        const _sqsSendMessageProps = props.sqsSendMessageProps !== undefined ?
            defaults.overrideProps(_defaultSqsSendMessageProps, props.sqsSendMessageProps as task.SqsSendMessageProps):
            _defaultSqsSendMessageProps;

        const _queueTask: task.SqsSendMessage = new task.SqsSendMessage(this, `${id}SendMessage`, _sqsSendMessageProps);


        const _failedState = new sfn.Fail(this, `${id}TaskFailed`, {
            cause: sfn.JsonPath.stringAt('$.cause')
        });
        _queueTask.addCatch(_failedState);

        _queueTask.addRetry({
            backoffRate: 2,
            maxAttempts: 6,
            interval: cdk.Duration.seconds(3)
        });

        this.startState = _queueTask;
        this.endStates = [ _queueTask ]
        this.sqsQueue = _sqsLambda.sqsQueue;
        this.lambda = _sqsLambda.lambdaFunction;
        this.deadLetterQueue = _sqsLambda.deadLetterQueue;

        if (props.stateMachine !== undefined) {
            props.stateMachine.grantTaskResponse(this.lambda.role!);
        } else {
            const _lambdaStateMatchineTaskPolicy = new iam.Policy(this, 'LambdaStateMachineTask', {
                statements: [ new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [ 'states:SendTaskSuccess', 'states:sendTaskFailure', 'states:SendTaskHeartbeat' ],
                        resources: [ '*' ]
                    })
                ]
            });

            _lambdaStateMatchineTaskPolicy.attachToRole(_sqsLambda.lambdaFunction.role!);
            (_lambdaStateMatchineTaskPolicy.node.defaultChild as iam.CfnPolicy).addMetadata('cfn_nag', {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: 'State machine resource not available, hence defaulting to "*"'
                }]
            });
        }
    }
}