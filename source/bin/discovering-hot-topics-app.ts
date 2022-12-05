#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from '@aws-cdk/core';
import { ApplytoLambda } from '../lib/aspects/apply-to-lambda';
import { AppRegistry } from '../lib/aspects/app-registry';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';

const app = new cdk.App();
const dht = new DiscoveringHotTopicsStack(app, 'discovering-hot-topics-using-machine-learning', {
    description: `(${app.node.tryGetContext(
        'solution_id'
    )}) - Discovering Hot Topics using Machine Learning. Version %%VERSION%%`
});

cdk.Aspects.of(app).add(new ApplytoLambda(dht, 'CustomConfig'));
cdk.Aspects.of(app).add(new AppRegistry(dht, 'AppRegistry'));
