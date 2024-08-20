/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
import * as cdk from 'aws-cdk-lib';
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
});
