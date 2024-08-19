/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Aws, Stack } from 'aws-cdk-lib';
import { EventManager } from '../lib/integration/event-manager-construct';

test ('Event Bus creation', () => {
    const stack = new Stack();

    new EventManager(stack, 'TestEventManagerConstruct', {
        ruleConfig: [{
            eventPattern: {
                account: [ Aws.ACCOUNT_ID ],
                region: [ Aws.REGION ],
                resources: [ `arn:${Aws.PARTITION}:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:*` ],
                source: [ 'com.platform.event.*' ]
            }
        }],
        eventBusName: 'TestEventBus'
    });
});