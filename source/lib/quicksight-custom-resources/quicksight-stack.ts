#!/usr/bin/env node
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

import { NestedStack, CfnParameter, Construct, NestedStackProps } from '@aws-cdk/core';
import { QuickSight, QuickSightSetup } from './quicksight-construct';
import { ExecutionRole } from '../solution-helper/lambda-role-cloudwatch-construct';
export class QuickSightStack extends NestedStack {
    private _quickSight: QuickSight;

    constructor(scope: Construct, id: string, props?:NestedStackProps) {
        super(scope, id, props);

        /**
         * The QuickSight source template arn should follow the format below. The sourceTemplateAccountId is the aws
         * account id that is sharing the template and should have
         * `arn:${cdk.Aws.PARTITION}:quicksight:${cdk.Aws.REGION}:${sourceTemplateAccountId}:template/${sourceTemplateName}`
         * either granted public access to its template or specific access for this account to use it.
         */
        const quickSightSourceTemplateArn = new CfnParameter(this, 'QuickSightSourceTemplateArn', {
            type: 'String',
            description: 'The Amazon QuickSight template arn to use as the source template when creating analysis and dashboard resources',
            allowedPattern: '^arn:\\S+:quicksight:\\S+:\\d{12}:template/\\S+$',
            constraintDescription: 'Provide an arn matching an Amazon Quicksight template arn. The input did not match the validation pattern.'
        });

        /**
         * The QuickSight principal is used as the principal in the permissions of QuickSight resources created by the custom resources.
         * `arn:${cdk.Aws.PARTITION}:quicksight:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:user/${namespace}/${user_name`
         *
         * Example for namescape is 'default'. You can use aws cli command quicksight list-users and list-namespaces to choose from
         * Sample CLI command:
         * aws quicksight list-namespaces --aws-account-id $AWS_ACCOUNT_ID
         * aws quicksight list-users --aws-account-id $AWS_ACCOUNT_ID  --namespace default
         *
         */
        const quicksightPrincipalArn = new CfnParameter(this, 'QuickSightPrincipalArn', {
            type: 'String',
            description: 'The Amazon QuickSight principal arn used in the permissions of QuickSight resources',
            allowedPattern: '^arn:\\S+:quicksight:\\S+:\\d{12}:user/\\S+$',
            constraintDescription: 'Provide an arn matching an Amazon Quicksight principal arn. The input did not match the validation pattern.'
        });

        const s3AccessLogging = new CfnParameter(this, 'S3AccessLogBucket', {
            type: 'String',
            description: 'The S3 Access Log bucket arn',
            allowedPattern: 'arn:\\S+:s3:::\\S+$',
            constraintDescription: 'Please provide a valid S3 bucket arn to store S3 access logs'
        });

        const customResourceRole = new ExecutionRole(this, 'CustomResourceRole');

        this._quickSight = new QuickSight(this, 'Quicksight', {
            name: 'SO0122-Discovering-Hot-Topics-QS-Dashboard',
            resource: QuickSightSetup.ALL,
            sourceTemplateArn: quickSightSourceTemplateArn.valueAsString,
            principalArn: quicksightPrincipalArn.valueAsString,
            workgroupName: 'primary',
            logLevel: 'INFO',
            role: customResourceRole.Role
        });
    }

    public get analysisURLOutput(): string {
        return this._quickSight.analysisURL;
    }

    public get dashboardURLOutput(): string {
        return this._quickSight.dashboardURL;
    }
}
