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

import { Template } from 'aws-cdk-lib/assertions';
import { Aws, Stack } from 'aws-cdk-lib';
import { QuickSightStack } from '../lib/quicksight-custom-resources/quicksight-stack';

test('test QuickSight stackCreation', () => {
    const stack = new Stack();
    new QuickSightStack(stack, 'testQuickSight', {
        parameters: {
            'QuickSightSourceTemplateArn': 'arn:aws:quicksight:us-east-1:fakeaccount:template/template-name',
            'QuickSightPrincipalArn': 'arn:aws:quicksight:us-east-1:fakeaccount:user/namespace/fakeuser',
            'S3AccessLogBucket': 'arn:aws:s3:::fakebucketforaccesslogging',
            'SolutionID': 'SO0122',
            'SolutionName': 'Discovering-Hot-Topics-QS-Dashboard',
            'ParentStackName': Aws.STACK_NAME
        }
    });
});
