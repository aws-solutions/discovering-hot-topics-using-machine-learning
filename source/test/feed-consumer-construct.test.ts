/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICNSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { Runtime, Code } from "@aws-cdk/aws-lambda";
import { SynthUtils } from '@aws-cdk/assert';
import { Duration, Stack } from '@aws-cdk/core';
import { FeedConsumer } from '../lib/ingestion/feed-consumer-construct';
import '@aws-cdk/assert/jest';

test('Test Lambda with Kinesis', () => {
    const stack = new Stack();

    new FeedConsumer(stack,'FeedConsumerConstruct', {
        environment: {
            WORKFLOW_ARN: 'arn:aws:states:us-east-1:someaccountid:stateMachine:WorkflowEngine12346891012-ad234ab'
        },
        timeout: Duration.minutes(5),
        runtime: Runtime.NODEJS_12_X,
        code: Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

});