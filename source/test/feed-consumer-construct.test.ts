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

import { Duration, Stack } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FeedConsumer } from '../lib/ingestion/feed-consumer-construct';

test('Test Lambda with Kinesis', () => {
    const stack = new Stack();

    new FeedConsumer(stack, 'FeedConsumerConstruct', {
        functionProps: {
            environment: {
                WORKFLOW_ARN: 'arn:aws:states:us-east-1:someaccountid:stateMachine:WorkflowEngine12346891012-ad234ab'
            },
            timeout: Duration.minutes(5),
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            handler: 'index.handler'
        }
    });
});
