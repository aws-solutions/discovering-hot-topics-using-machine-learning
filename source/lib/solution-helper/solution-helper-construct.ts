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

import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { ExecutionRole } from './lambda-role-cloudwatch-construct';


export interface SolutionHelperProps {
    readonly solutionId: string;
    readonly searchQuery?: string;
    readonly langFilter?: string;
    readonly solutionVersion: string;
    readonly topicModelingFreq: string;
    readonly twitterIngestionFreq?: string;
    readonly newsFeedIngestionFreq?: string;
    readonly newsFeedsIngestionSearchQuery?: string;
    readonly youTubeIngestionFreq?: string;
    readonly youTubeSearchQuery?: string;
    readonly youTubeChannelID?: string
}

export class SolutionHelper extends cdk.Construct {
    private readonly _UuidCustomResource: cdk.CustomResource;

    constructor(scope: cdk.Construct, id: string, props: SolutionHelperProps) {
        super(scope, id);

        const metricsMapping = new cdk.CfnMapping(this, 'AnonymousData', {
            mapping: {
                'SendAnonymousData': {
                    'Data': 'Yes'
                }
            }
        });

        const metricsCondition = new cdk.CfnCondition(this, 'AnonymousDatatoAWS', {
            expression: cdk.Fn.conditionEquals(metricsMapping.findInMap('SendAnonymousData', 'Data'), 'Yes')
        });

        const helperRole = new ExecutionRole(this, 'Role');

        const helperFunction = new lambda.Function(this, 'SolutionHelper', {
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'lambda_function.handler',
            description: 'This function generates UUID for each deployment and sends anonymous data to the AWS Solutions team',
            role: helperRole.Role,
            code: lambda.Code.fromAsset(`${__dirname}/../../lambda/solution_helper`),
            timeout: cdk.Duration.seconds(30),
            environment: {
                // the query is only used to determin query complexity, actually query is not posted for metrics data
                TWITTER_SEARCH_QUERY: props.searchQuery? props.searchQuery: "",
                TWITTER_LANG_FILTER: props.langFilter? props.langFilter: "",
                TWITTER_INGEST_FREQ: props.twitterIngestionFreq? props.twitterIngestionFreq: "",
                TOPIC_JOB_FREQ: props.topicModelingFreq,
                NEWSFEEDS_INGESTION_FREQ: props.newsFeedIngestionFreq? props.newsFeedIngestionFreq: "",
                // the query is only used to determin query complexity, actually query is not posted for metrics data
                NEWSFEEDS_SEARCH_QUERY: props.newsFeedsIngestionSearchQuery? props.newsFeedsIngestionSearchQuery: "",
                YOUTUBE_INGESTION_FREQ: props.youTubeIngestionFreq? props.youTubeIngestionFreq: "",
                YOUTUBE_SEARCH_QUERY: props.youTubeSearchQuery? props.youTubeSearchQuery: "",
                YOUTUBE_CHANNEL_ID: props.youTubeChannelID? props.youTubeChannelID: ""
            }
        });

        (helperFunction.node.defaultChild as lambda.CfnFunction).addMetadata('cfn_nag', {
            rules_to_suppress: [{
                "id": "W89",
                "reason": "This is not a rule for the general case, just for specific use cases/industries"
            }, {
                "id": "W92",
                "reason": "Impossible for us to define the correct concurrency for clients"
            }]
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
                'Version': props.solutionVersion
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
