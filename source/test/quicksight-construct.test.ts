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

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { QuickSight, QuickSightSetup } from '../lib/quicksight-custom-resources/quicksight-construct';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';

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
        })
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('Custom::QuickSightResources', {
        "Resource": "all",
        "LogLevel": "INFO",
        "ApplicationName": "solution-name",
        "WorkGroupName": "testGroup"
    });

    expect(stack).toHaveResourceLike('AWS::IAM::Role', {
        "AssumeRolePolicyDocument": {
            "Statement": [{
                "Action": "sts:AssumeRole",
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                }
            }]
        }
    });

    expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
        "Handler": "lambda_function.handler",
        "Runtime": "python3.8",
        "Timeout": 30
    });
});