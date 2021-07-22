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

import { SynthUtils } from '@aws-cdk/assert';
import * as events from '@aws-cdk/aws-events';
import * as cdk from '@aws-cdk/core';
import { TwitterSearchIngestion } from '../lib/ingestion/twitter-search-stack';

test ('Event Bus creation', () => {
    const stack = new cdk.Stack();

    const _twtitterSearchIngestion = new TwitterSearchIngestion(stack, 'TwitterSearch', {
        parameters: {
            'EventBus': new events.EventBus(stack, 'testBus').eventBusArn,
            'SuppertedLang': "en,es,fr",
            'QueryParameter': "fakequery",
            'SSMPathForCredentials': "/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter",
            'IngestQueryFrequency': 'cron(0 5 * * ? *)'
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
