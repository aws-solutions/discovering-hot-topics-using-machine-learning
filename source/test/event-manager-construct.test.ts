/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
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