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

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ApplytoLambda } from '../lib/aspects/apply-to-lambda';

test('test adding custom config', () => {
    const stack = new cdk.Stack();
    new ApplytoLambda(stack, 'TestConfig');
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::LayerVersion', {
        CompatibleRuntimes: ['python3.11'],
        Content: {}
    });
});

test('visting node lambda runtimes and adding aspects', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app);
    new lambda.Function(stack, 'testFunction', {
        code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler'
    });

    cdk.Aspects.of(stack).add(new ApplytoLambda(stack, 'testConfigWithNode'));
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Environment: {
            Variables: {
                'AWS_SDK_USER_AGENT': '{ "customUserAgent": "AwsSolution/undefined/undefined" }'
            }
        },
        Handler: 'index.handler',
        Role: {},
        Code: {
            S3Bucket: {},
            S3Key: Match.anyValue()
        }
    });

    Template.fromStack(stack).hasResource('AWS::Lambda::LayerVersion', {
        'Type': 'AWS::Lambda::LayerVersion'
    });
});

test('visting node python runtimes and adding aspects', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app);
    new lambda.Function(stack, 'testFunction', {
        code: lambda.Code.fromAsset(`${__dirname}/../lambda/quicksight-custom-resources`),
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'handler'
    });

    cdk.Aspects.of(stack).add(new ApplytoLambda(stack, 'testConfigWithNode'));
    Template.fromStack(stack).hasResource('AWS::Lambda::Function', {
        Type: 'AWS::Lambda::Function',
        Properties: {
            Runtime: 'python3.11',
            Environment: {
                Variables: {
                    'AWS_SDK_USER_AGENT': '{ "user_agent_extra": "AwsSolution/undefined/undefined" }'
                }
            },
            Handler: 'handler',
            Layers: [{}],
            Role: {},
            Code: {
                S3Bucket: {},
                S3Key: Match.anyValue()
            }
        }
    });

    Template.fromStack(stack).hasResource('AWS::Lambda::LayerVersion', {
        'Type': 'AWS::Lambda::LayerVersion'
    });
});
