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