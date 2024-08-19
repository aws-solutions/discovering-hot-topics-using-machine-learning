/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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
            runtime: Runtime.NODEJS_20_X,
            code: Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            handler: 'index.handler'
        }
    });
});
