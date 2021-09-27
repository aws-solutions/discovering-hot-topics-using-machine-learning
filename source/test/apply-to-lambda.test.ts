/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { ApplytoLambda } from '../lib/aspects/apply-to-lambda';

test ('test adding custom config', () => {
    const stack = new cdk.Stack();
    new ApplytoLambda(stack, 'TestConfig');
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('AWS::Lambda::LayerVersion', {
        Type: 'AWS::Lambda::LayerVersion',
        Properties: {
            CompatibleRuntimes: [
                "python3.8"
            ],
            Content: {

            }
        }
    }, ResourcePart.CompleteDefinition);
});

test('visting node lambda runtimes and adding aspects', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app);
    new lambda.Function(stack, 'testFunction', {
        code: lambda.Code.fromAsset(`${__dirname}/../lambda/create-partition`),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler'
    });

    app.node.applyAspect(new ApplytoLambda(stack, 'testConfigWithNode'));
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Runtime: "nodejs14.x",
            Environment: {
                Variables: {
                    "AWS_SDK_USER_AGENT": "{ \"customUserAgent\": \"AwsSolution/undefined/undefined\" }"
                }
            },
            Handler: 'index.handler',
            Role: {},
            Code: {
                S3Bucket: {},
                S3Key: {}
            }
        }
    }, ResourcePart.CompleteDefinition);

    expect(stack).toHaveResource('AWS::Lambda::LayerVersion', {
        "Type": "AWS::Lambda::LayerVersion"
    }, ResourcePart.CompleteDefinition);
});

test('visting node python runtimes and adding aspects', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app);
    new lambda.Function(stack, 'testFunction', {
        code: lambda.Code.fromAsset(`${__dirname}/../lambda/quicksight-custom-resources`),
        runtime: lambda.Runtime.PYTHON_3_8,
        handler: 'handler'
    });

    app.node.applyAspect(new ApplytoLambda(stack, 'testConfigWithNode'));
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Runtime: "python3.8",
            Environment: {
                Variables: {
                    "AWS_SDK_USER_AGENT": "{ \"user_agent_extra\": \"AwsSolution/undefined/undefined\" }"
                }
            },
            Handler: 'handler',
            Layers: [{}],
            Role: {},
            Code: {
                S3Bucket: {},
                S3Key: {}
            }
        }
    }, ResourcePart.CompleteDefinition);

    expect(stack).toHaveResource('AWS::Lambda::LayerVersion', {
        "Type": "AWS::Lambda::LayerVersion"
    }, ResourcePart.CompleteDefinition);
});
