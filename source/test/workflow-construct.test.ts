/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

import { Template } from 'aws-cdk-lib/assertions';
import { Chain, StateMachineType, Succeed, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Workflow } from '../lib/text-analysis-workflow/workflow-construct';


test('test standard workflow stack', () => {
    const stack = new cdk.Stack();
    new Workflow (stack, 'WorkflowStack', {
        chain: Chain.start(new Wait(stack, 'WaitState', {
                        time: WaitTime.duration(Duration.minutes(1)),
                    }))
                    .next(new Succeed(stack, 'Success'))
    });
    });

test('test express workflow stack', () => {
    const stack = new cdk.Stack();
    new Workflow (stack, 'WorkflowStack', {
        stateMachineType: StateMachineType.EXPRESS,
        chain: Chain.start(new Wait(stack, 'WaitState', {
                        time: WaitTime.duration(Duration.minutes(1)),
                    }))
                    .next(new Succeed(stack, 'Success'))
    });
    });