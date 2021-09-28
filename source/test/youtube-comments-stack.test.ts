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

import { SynthUtils } from '@aws-cdk/assert';
import * as events from '@aws-cdk/aws-events';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as cdk from '@aws-cdk/core';
import { YoutubeComments } from '../lib/ingestion/youtube-comments-stacks';

 test('test standard workflow stack', () => {
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
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});