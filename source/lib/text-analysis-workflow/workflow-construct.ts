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

import { LambdaToStepfunctions } from '@aws-solutions-constructs/aws-lambda-stepfunctions';
import * as cdk from 'aws-cdk-lib';
import { CfnPolicy, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Function, IFunction } from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface WorkflowProps {
    readonly stateMachineType?: sfn.StateMachineType;
    readonly chain: sfn.Chain;
    readonly lambdaFunc?: IFunction;
}

export class Workflow extends Construct {
    private _stMachine: sfn.StateMachine;

    constructor(scope: Construct, id: string, props: WorkflowProps) {
        super(scope, id);

        if (props.lambdaFunc != null && props.lambdaFunc != undefined) {
            const lambdaStepFunction = new LambdaToStepfunctions(this, 'WorkflowEngine', {
                existingLambdaObj: props.lambdaFunc as Function,
                stateMachineProps: {
                    definitionBody: sfn.DefinitionBody.fromChainable(props.chain),
                    tracingEnabled: true,
                    ...(props.stateMachineType === sfn.StateMachineType.EXPRESS && {
                        stateMachineType: props.stateMachineType,
                        logs: {
                            level: sfn.LogLevel.ERROR,
                            includeExecutionData: false,
                            destination: new logs.LogGroup(this, 'TextAnalysisWF', {
                                logGroupName: `/aws/vendedlogs/states/${cdk.Stack.of(this).getLogicalId}`.slice(0, 255)
                            })
                        }
                    })
                }
            });
            this._stMachine = lambdaStepFunction.stateMachine;
            const role = this._stMachine.node.findChild('Role') as Role;
            const cfnDefaultPolicy = role.node.findChild('DefaultPolicy').node.defaultChild as CfnPolicy;

            cfnDefaultPolicy.addMetadata('cfn_nag', {
                rules_to_suppress: [
                    {
                        id: 'W76',
                        reason:
                            'The policy adds cloudwatch alarms and allows step function to invoke lambda tasks. Suppressing the ' +
                            'SPCM violation as this policy is required to monitor as well as invoke specific tasks'
                    },
                    {
                        id: 'W12',
                        reason: "The 'LogDelivery' actions do not support resource-level authorizations"
                    }
                ]
            });
        } else {
            const _stateMachineRole = new Role(this, 'StateMachineRole', {
                assumedBy: new ServicePrincipal(`states.${cdk.Aws.REGION}.amazonaws.com`)
            });

            const stateMachineLogPolicy = new Policy(this, 'StateMachineLogPolicy', {
                statements: [
                    new PolicyStatement({
                        actions: [
                            'logs:CreateLogDelivery',
                            'logs:GetLogDelivery',
                            'logs:UpdateLogDelivery',
                            'logs:DeleteLogDelivery',
                            'logs:ListLogDeliveries',
                            'logs:PutResourcePolicy',
                            'logs:DescribeResourcePolicies',
                            'logs:DescribeLogGroups'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                        effect: Effect.ALLOW
                    })
                ]
            });

            _stateMachineRole.attachInlinePolicy(stateMachineLogPolicy);

            this._stMachine = new sfn.StateMachine(this, 'WorkflowEngine', {
                definitionBody: sfn.DefinitionBody.fromChainable(props.chain),
                tracingEnabled: true,
                ...(props.stateMachineType === sfn.StateMachineType.EXPRESS && {
                    stateMachineType: props.stateMachineType,
                    role: _stateMachineRole,
                    logs: {
                        level: sfn.LogLevel.ERROR,
                        includeExecutionData: false,
                        destination: new logs.LogGroup(this, 'TextAnalysisWF', {
                            logGroupName: `/aws/vendedlogs/states/${cdk.Stack.of(this).getLogicalId}`.slice(0, 255)
                        })
                    }
                })
            });

            this._stMachine.node.addDependency(_stateMachineRole);
        }
        NagSuppressions.addResourceSuppressions(
            this._stMachine, [
            {
                id: 'AwsSolutions-SF1', reason: "Information required for troubleshooting is logged by state function and lambda functions",
            }
        ],
            true
        );
    }

    public get stateMachine(): sfn.StateMachine {
        return this._stMachine;
    }
}
