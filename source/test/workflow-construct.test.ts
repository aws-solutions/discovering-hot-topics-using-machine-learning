/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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