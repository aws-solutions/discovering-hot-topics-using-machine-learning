#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
import * as lambda_python from '@aws-cdk/aws-lambda-python';
import * as cdk from '@aws-cdk/core';
import { NodejsLayerVersion } from '../awsnodejs-lambda-layer/layer';

export class ApplytoLambda extends cdk.Construct implements cdk.IAspect {
    readonly pythonLayer: lambda.LayerVersion;
    readonly nodejsLayer: lambda.LayerVersion;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this.pythonLayer = new lambda_python.PythonLayerVersion(this, 'PythonLibLayer', {
            entry: 'lambda/layers/python_lambda_layer',
            description: 'This layer has boto config initialization and logging functions',
            compatibleRuntimes: [ lambda.Runtime.PYTHON_3_8 ]
        });

        this.nodejsLayer = new NodejsLayerVersion(this, id, {
            entry: 'lambda/layers/aws-nodesdk-custom-config',
            compatibleRuntimes: [ lambda.Runtime.NODEJS_14_X ],
            description: 'This layer configures AWS Node SDK initialization'
        });
    }

    public visit(node: cdk.IConstruct): void {
        // the various rules that apply to the lambda function
        this.applyUserAgentAspect(node); // add user agent for node and python
    }

    private applyUserAgentAspect(node: cdk.IConstruct): void {
        const solutionID = node.node.tryGetContext('solution_id');
        const solutionVersion = node.node.tryGetContext('solution_version');

        if (node instanceof lambda.Function) {
            if (node.runtime.family == lambda.RuntimeFamily.NODEJS) {
                node.addLayers(this.nodejsLayer);
                node.addEnvironment(
                    "AWS_SDK_USER_AGENT", `{ "customUserAgent": "AwsSolution/${solutionID}/${solutionVersion}" }`
                );
            } else if (node.runtime.family == lambda.RuntimeFamily.PYTHON) {
                node.addLayers(this.pythonLayer);
                node.addEnvironment(
                    "AWS_SDK_USER_AGENT", `{ "user_agent_extra": "AwsSolution/${solutionID}/${solutionVersion}" }`
                );
            }
        }
    }
}