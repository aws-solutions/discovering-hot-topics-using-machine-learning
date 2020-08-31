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


import { Construct, Aws } from '@aws-cdk/core';
import { StateMachine, Chain, LogLevel, CfnStateMachine, StateMachineType } from '@aws-cdk/aws-stepfunctions';
import { CfnPolicy, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { LogGroup, LogStream } from '@aws-cdk/aws-logs';
import { DefaultLogGroupProps } from '@aws-solutions-constructs/core';
export interface WorkflowProps {
    stateMachineType?: StateMachineType;
    chain: Chain
}
export class Workflow extends Construct {
    private _stMachine: StateMachine

    constructor (scope: Construct, id: string, props: WorkflowProps) {
        super(scope, id);
        
        let _stateMachineRole: Role;

        if (props.stateMachineType === StateMachineType.EXPRESS) {
            const logGroup: LogGroup = new LogGroup(this, 'statemachine-log-group', DefaultLogGroupProps());
            const logStream: LogStream = logGroup.addStream('statemachine-log-stream');

            _stateMachineRole = new Role(this, 'StateMachineRole', {
                assumedBy: new ServicePrincipal(`states.${Aws.REGION}.amazonaws.com`)
            });

            const stateMachineLogPolicy = new Policy(this, 'StateMachineLogPolicy');
            stateMachineLogPolicy.addStatements(new PolicyStatement({
                actions: [                
                    "logs:CreateLogDelivery",
                    "logs:GetLogDelivery",
                    "logs:UpdateLogDelivery",
                    "logs:DeleteLogDelivery",
                    "logs:ListLogDeliveries",
                    "logs:PutResourcePolicy",
                    "logs:DescribeResourcePolicies",
                    "logs:DescribeLogGroups"
                ],
                resources: [ '*' ],
                effect: Effect.ALLOW
            }));

            stateMachineLogPolicy.attachToRole(_stateMachineRole);
            (stateMachineLogPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
                cfn_nag: {
                    rules_to_suppress: [{
                        id: 'W12',
                        reason: 'The stepfunction log policy requires that resources be "*"'
                    }]
                }
            };

            this._stMachine = new StateMachine(this, 'WorkflowEngine', {
                definition: props.chain,
                ...(props.stateMachineType === StateMachineType.EXPRESS && {
                    stateMachineType: props.stateMachineType,
                    role: _stateMachineRole
                })
            });

            const cfnStateMachine = this._stMachine.node.defaultChild as CfnStateMachine;
            cfnStateMachine.addPropertyOverride(
                'LoggingConfiguration', {
                    Destinations: [{
                        CloudWatchLogsLogGroup: {
                            LogGroupArn: logGroup.logGroupArn
                        }
                    }],
                    IncludeExecutionData: true,
                    Level: LogLevel.ALL
                }
            );

        } else {
            this._stMachine = new StateMachine(this, 'WorkflowEngine', {
                definition: props.chain
            });
        }
    }

    public get stateMachine(): StateMachine {
        return this._stMachine;
    }
}