/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { ExecutionRole } from './lambda-role-cloudwatch-construct';

export interface SolutionHelperProps {
    readonly solutionId: string;
    readonly solutionVersion: string;
    readonly topicModelingFreq: string;
    readonly deployNewsFeedIngestion: string;
    readonly newsFeedIngestionFreq?: string;
    readonly newsFeedsIngestionSearchQuery?: string;
    readonly deployYoutubeIngestion: string;
    readonly youTubeIngestionFreq?: string;
    readonly youTubeSearchQuery?: string;
    readonly youTubeChannelID?: string;
    readonly deployRedditIngestion: string;
    readonly redditIngestionFreq?: string;
    readonly subredditsToFollow?: string;
    readonly deployCustomIngestion: string;
}

export class SolutionHelper extends Construct {
    private readonly _UuidCustomResource: cdk.CustomResource;

    constructor(scope: Construct, id: string, props: SolutionHelperProps) {
        super(scope, id);

        const metricsMapping = new cdk.CfnMapping(this, 'AnonymousData', {
            mapping: {
                'SendAnonymousData': {
                    'Data': 'Yes'
                }
            },
            lazy: true
        });

        const metricsCondition = new cdk.CfnCondition(this, 'AnonymousDatatoAWS', {
            expression: cdk.Fn.conditionEquals(metricsMapping.findInMap('SendAnonymousData', 'Data'), 'Yes')
        });

        const helperRole = new ExecutionRole(this, 'Role');

        const helperFunction = new lambda.Function(this, 'SolutionHelper', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'lambda_function.handler',
            description:
                'This function generates UUID for each deployment and sends anonymous data to the AWS Solutions team',
            role: helperRole.Role,
            code: lambda.Code.fromAsset(`${__dirname}/../../lambda/solution_helper`),
            timeout: cdk.Duration.seconds(30)
        });

        (helperFunction.node.defaultChild as lambda.CfnFunction).addMetadata('cfn_nag', {
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

        this._UuidCustomResource = new cdk.CustomResource(this, 'CreateUniqueID', {
            serviceToken: helperFunction.functionArn,
            properties: {
                'Resource': 'UUID'
            },
            resourceType: 'Custom::CreateUUID'
        });

        const sendDataFunction = new cdk.CustomResource(this, 'SendAnonymousData', {
            serviceToken: helperFunction.functionArn,
            properties: {
                'Resource': 'AnonymousMetric',
                'SolutionId': props.solutionId,
                'UUID': this._UuidCustomResource.getAttString('UUID'),
                'Region': cdk.Aws.REGION,
                'Version': props.solutionVersion,
                'TopicJobFreq': props.topicModelingFreq,
                'NewsFeedsIngestionEnabled': props.deployNewsFeedIngestion,
                'NewsFeedsIngestionFreq': props.newsFeedIngestionFreq ? props.newsFeedIngestionFreq : '',
                'NewsFeedsSearchQuery': props.newsFeedsIngestionSearchQuery ? props.newsFeedsIngestionSearchQuery : '',
                'YoutubeIngestionEnabled': props.deployYoutubeIngestion,
                'YouTubeIngestionFreq': props.youTubeIngestionFreq ? props.youTubeIngestionFreq : '',
                'YoutubeSearchQuery': props.youTubeSearchQuery ? props.youTubeSearchQuery : '',
                'YoutubeChannelId': props.youTubeChannelID ? props.youTubeChannelID : '',
                'RedditIngestionEnabled': props.deployRedditIngestion,
                'RedditIngestionFreq': props.redditIngestionFreq ? props.redditIngestionFreq : '',
                'SubredditsToFollow': props.subredditsToFollow ? props.subredditsToFollow : '',
                'DeployCustomIngestion': props.deployCustomIngestion
            },
            resourceType: 'Custom::AnonymousData'
        });
        // the send data custom resource to be enabled under metrics condition
        // the lambda and UUID resource still deployed as the UUID is used for other features in the solution
        (sendDataFunction.node.defaultChild as lambda.CfnFunction).cfnOptions.condition = metricsCondition;
    }

    public get UUIDCustomResource(): cdk.CustomResource {
        return this._UuidCustomResource;
    }
}
