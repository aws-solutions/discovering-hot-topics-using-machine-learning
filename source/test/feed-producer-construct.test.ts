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

import * as assert from 'assert';
import { Duration, Stack } from 'aws-cdk-lib';
import { Stream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FeedProducer } from '../lib/ingestion/feed-producer-construct';

test('Test Lambda with role and scheduler', () => {
    const stack = new Stack();

    const producerStack = new FeedProducer(stack, 'FeedProducerConstruct', {
        functionProps: {
            timeout: Duration.minutes(5),
            runtime: Runtime.NODEJS_20_X,
            code: Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            handler: 'index.handler',
            environment: {
                SUPPORTED_LANG: 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw',
                QUERY_PARAM: 'Health',
                RESULT_TYPE: 'mixed'
            }
        },
        ingestFrequency: '(0/2 * * * ? *)',
        credentialKeyPath: '/some/dummy/path/test',
        stream: new Stream(stack, 'TestStream', {
            encryption: StreamEncryption.MANAGED
        })
    });

    assert(producerStack.producerFunction !== null);
});
