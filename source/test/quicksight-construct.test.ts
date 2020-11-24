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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Aws, Stack } from '@aws-cdk/core';
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
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});