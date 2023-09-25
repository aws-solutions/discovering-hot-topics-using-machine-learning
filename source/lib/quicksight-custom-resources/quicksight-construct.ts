#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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

import { Effect, IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export enum QuickSightSetup {
    DATA_SET = 'dataset',
    DATA_SOURCE = 'datasource',
    ANALYSIS = 'analysis',
    DASHBOARD = 'dashboard',
    ALL = 'all'
}

export interface QuickSightProps {
    readonly name: string;
    readonly resource: QuickSightSetup;
    readonly sourceTemplateArn: string;
    readonly principalArn: string;
    readonly workgroupName: string;
    readonly logLevel: string;
    readonly role: IRole;
    readonly parentStackName: string;
}
export class QuickSight extends Construct {
    private _analysisURL: string;
    private _dashboardURL: string;

    constructor(scope: Construct, id: string, props: QuickSightProps) {
        super(scope, id);
        const qsCreateResource = this.createCustomResource(props);
        this._analysisURL = qsCreateResource.getAtt('analysis_url').toString();
        this._dashboardURL = qsCreateResource.getAtt('dashboard_url').toString();
    }

    private createCustomResource(props: QuickSightProps): cdk.CustomResource {
        const customResourcePolicy = new Policy(this, 'QSCustomResourcePolicy', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        'quicksight:CreateAnalysis',
                        'quicksight:DeleteAnalysis',
                        'quicksight:CreateDataSet',
                        'quicksight:DeleteDataSet',
                        'quicksight:CreateDataSource',
                        'quicksight:DeleteDataSource',
                        'quicksight:Describe*',
                        'quicksight:Get*',
                        'quicksight:List*',
                        'quicksight:PassDataSet',
                        'quicksight:PassDataSource',
                        'quicksight:RestoreAnalysis',
                        'quicksight:SearchAnalyses',
                        'quicksight:CreateDashboard',
                        'quicksight:DeleteDashboard'
                    ],
                    resources: [`arn:${cdk.Aws.PARTITION}:quicksight:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*/*`]
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['quicksight:DescribeTemplate'],
                    resources: [props.sourceTemplateArn]
                })
            ]
        });

        customResourcePolicy.attachToRole(props.role);

        const customResourceFunction = new lambda.Function(this, 'CustomResource', {
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'lambda_function.handler',
            role: props.role,
            code: lambda.Code.fromAsset('lambda/quicksight-custom-resources'),
            timeout: cdk.Duration.seconds(30)
        });
        customResourceFunction.node.addDependency(customResourcePolicy);

        (customResourceFunction.node.defaultChild as lambda.CfnFunction).addMetadata('cfn_nag', {
            rules_to_suppress: [
                {
                    'id': 'W89',
                    'reason': 'This is not a rule for the general case, just for specific use cases/industries'
                },
                {
                    'id': 'W92',
                    'reason': 'Impossible for us to define the correct concurrency for clients'
                }
            ]
        });

        const customResource = new cdk.CustomResource(this, 'QuickSightResources', {
            serviceToken: customResourceFunction.functionArn,
            properties: {
                Resource: props.resource,
                ApplicationName: props.name,
                StackName: props.parentStackName,
                LogLevel: props.logLevel,
                QuickSightSourceTemplateArn: props.sourceTemplateArn,
                QuickSightPrincipalArn: props.principalArn,
                WorkGroupName: props.workgroupName
            },
            resourceType: 'Custom::QuickSightResources'
        });

        customResource.node.addDependency(customResourcePolicy);
        return customResource;
    }

    public get analysisURL(): string {
        return this._analysisURL;
    }

    public get dashboardURL(): string {
        return this._dashboardURL;
    }
}
