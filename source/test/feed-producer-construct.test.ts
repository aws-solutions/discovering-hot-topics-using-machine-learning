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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { Stream, StreamEncryption } from '@aws-cdk/aws-kinesis';
import { Code, Runtime } from "@aws-cdk/aws-lambda";
import { Duration, Stack } from '@aws-cdk/core';
import * as assert from 'assert';
import { FeedProducer } from '../lib/ingestion/feed-producer-construct';


test('Test Lambda with role and scheduler', () => {
    const stack = new Stack();

    const producerStack = new FeedProducer(stack,'FeedProducerConstruct', {
        timeout: Duration.minutes(5),
        stream: new Stream(stack, 'TestStream', {
            encryption: StreamEncryption.MANAGED
        }),
        runtime: Runtime.NODEJS_12_X,
        code: Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
        solutionName: 'discovering-hot-topics-using-machine-learning',
        supportedLang: 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw',
        ingestFrequency: '(0/2 * * * ? *)',
        queryParameter: 'Health',
        credentialKeyPath: '/some/dummy/path/test'
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    assert(producerStack.producerFunction !== null);
});