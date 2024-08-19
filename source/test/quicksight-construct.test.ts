/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Aws, Stack } from 'aws-cdk-lib';
import { QuickSight, QuickSightSetup } from '../lib/quicksight-custom-resources/quicksight-construct';

test('QS custom resource creation', () => {
    const stack = new Stack();
    new QuickSight(stack, 'testQSConstruct', {
        name: 'solution-name',
        resource: QuickSightSetup.ALL,
        sourceTemplateArn: 'arn:some-parition:quicksight:some-region:fakeaccountid:template/solution_solution-name-v_1_0',
        principalArn: 'arn:some-partition:quicksight:some-region:fakeaccountid:user/namespace/some-role/some-user',
        logLevel: 'INFO',
        workgroupName: 'testGroup',
        role: new Role(stack, 'testRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
        }),
        parentStackName: Aws.STACK_NAME
    });
    });