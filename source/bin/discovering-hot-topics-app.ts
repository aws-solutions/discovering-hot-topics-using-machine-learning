#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { AppRegistry } from '../lib/aspects/app-registry';
import { ApplytoLambda } from '../lib/aspects/apply-to-lambda';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';

const app = new cdk.App();
const dht = new DiscoveringHotTopicsStack(app, 'discovering-hot-topics-using-machine-learning', {
    description: `(${app.node.tryGetContext(
        'solution_id'
    )}) - Discovering Hot Topics using Machine Learning. Version %%VERSION%%`,
    synthesizer: new cdk.DefaultStackSynthesizer({
        generateBootstrapVersionRule: false
    }),
});

NagSuppressions.addStackSuppressions(dht, [
    { id: 'AwsSolutions-L1', reason: 'Lambda running on Node are already on latest runtime (NodeJs20). Python lambda runtime is Python 3.11' },
    { id: 'AwsSolutions-IAM5', reason: 'All IAM policies defined in this solution grant only least-privilege permissions. Wild card for resources is used only for services which do not have a resource arn (Comprehend, Xray, Regoknition, Translate, State Machine) ' }
], true);

cdk.Aspects.of(app).add(new ApplytoLambda(dht, 'CustomConfig'));
cdk.Aspects.of(app).add(new AppRegistry(dht, 'AppRegistry'));
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));


