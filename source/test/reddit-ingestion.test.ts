/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as cdk from 'aws-cdk-lib';
import { RedditIngestion } from '../lib/ingestion/reddit-ingestion';

test('test reddit ingestion stack', () => {
    const stack = new cdk.Stack();
    const _eventBus = new events.EventBus(stack, 'Bus');
    const _stream = new kinesis.Stream(stack, 'Stream', {});

    new RedditIngestion(stack, 'testredditingestion', {
        parameters: {
            RedditAPIKey: '/fakelocation/reddit/comments',
            EventBus: _eventBus.eventBusArn,
            StreamARN: _stream.streamArn,
            RedditIngestionFrequency: 'cron(0/60 * * * ? *)',
            SubRedditsToFollow: 'r/test1,r/test2'
        }
    });
});
