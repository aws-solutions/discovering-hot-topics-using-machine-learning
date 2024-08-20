/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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
