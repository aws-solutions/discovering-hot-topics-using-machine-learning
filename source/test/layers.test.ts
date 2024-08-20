/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as sinon from 'sinon';
import { ApplytoLambda } from '../lib/aspects/apply-to-lambda';
import * as layer from '../lib/awsnodejs-lambda-layer/layer';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';

/*
* Sample snapshot test
*/
test('Sample snapshot test', () => {
    const localCopySpy = sinon.spy(layer.NodejsLayerVersion,'copyFilesSyncRecursively');
    const app = new cdk.App();
    const stack = new DiscoveringHotTopicsStack(app, 'DHT', {
        description: 'This is a test stack to execute unit tests'
    });
    cdk.Aspects.of(stack).add(new ApplytoLambda(stack, 'Layer'));
    Template.fromStack(stack).hasResource('AWS::Lambda::LayerVersion', {
        "Type": "AWS::Lambda::LayerVersion"
    });

    sinon.assert.calledOnce(localCopySpy);
    localCopySpy.restore();
});