/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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
