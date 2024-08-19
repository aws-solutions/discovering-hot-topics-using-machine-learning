#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { CfnParameter, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ExecutionRole } from '../solution-helper/lambda-role-cloudwatch-construct';
import { QuickSight, QuickSightSetup } from './quicksight-construct';

export class QuickSightStack extends NestedStack {
    private _quickSight: QuickSight;

    constructor(scope: Construct, id: string, props:NestedStackProps) {
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

        /**
         * The Solution ID with which the nested stack is associated with
         */
        const solutionID = new CfnParameter(this, 'SolutionID', {
            type: 'String',
            description: 'The SolutionID with which the nested stack is associated',
            allowedPattern: 'SO([\\d]{4})',
            constraintDescription: 'Please provide the parent stack\'s solutionID. The pattern must match the following regular experssion SO([\d]{4})'
        });

        /**
         * The name of the solution with which the the nested stack is associated with
         */
        const solutionName = new CfnParameter(this, 'SolutionName', {
            type: 'String',
            description: 'The name of the solution for this stack',
            allowedPattern: '[\\w\\W]{1,200}',
            constraintDescription: 'Please provide the name of the solution to which the solution belongs to. The max length of the name is 200 characters'
        });

        /**
         * The name of the parent stack to use the AWS stack name for QuickSight resource creation
         */
        const parentStackName = new CfnParameter(this, 'ParentStackName', {
            type: 'String',
            description: 'The AWS Stack nane of the parent stack',
            allowedPattern: '[\\w\\W]{1,128}',
            constraintDescription: 'Please provide the AWS stack name with which the nested stack is associated with'
        });

        const customResourceRole = new ExecutionRole(this, 'CustomResourceRole');

        this._quickSight = new QuickSight(this, 'Quicksight', {
            name: `${solutionID.valueAsString}-${solutionName.valueAsString}`,
            resource: QuickSightSetup.ALL,
            sourceTemplateArn: quickSightSourceTemplateArn.valueAsString,
            principalArn: quicksightPrincipalArn.valueAsString,
            workgroupName: 'primary',
            logLevel: 'INFO',
            role: customResourceRole.Role,
            parentStackName: parentStackName.valueAsString
        });
    }

    public get analysisURLOutput(): string {
        return this._quickSight.analysisURL;
    }

    public get dashboardURLOutput(): string {
        return this._quickSight.dashboardURL;
    }
}
