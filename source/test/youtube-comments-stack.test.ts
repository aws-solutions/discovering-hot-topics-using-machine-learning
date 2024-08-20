/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as cdk from 'aws-cdk-lib';
import { YoutubeComments } from '../lib/ingestion/youtube-comments-stacks';

 test('test youtube ingestion stack', () => {
    const stack = new cdk.Stack();
    const _eventBus = new events.EventBus(stack, 'Bus');

    new YoutubeComments(stack, 'YouTubeCommentsIngestion', {
        parameters: {
            "EventBus": _eventBus.eventBusArn,
            "StreamARN": new kinesis.Stream(stack, 'Stream', {}).streamArn,
            "YoutubeAPIKey": 'fakeKey',
            "YouTubeSearchIngestionFreq": 'cron(0 12 * * ? *)',
            "YoutubeSearchQuery": 'fakeSearchString'
        }
    });
    });