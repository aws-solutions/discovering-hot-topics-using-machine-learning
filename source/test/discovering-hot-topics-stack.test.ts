/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';



test('test ingestion stack', () => {
    const stack = new Stack();
    new DiscoveringHotTopicsStack (stack, 'discoveringhottopicsusingmachinelearning', {
        description: 'Some fake description to test'
    });
    });
