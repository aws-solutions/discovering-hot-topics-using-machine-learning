/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Stack } from 'aws-cdk-lib';
import { TopicAnalysisProxy } from '../lib/integration/topic-analysis-proxy';
import { EventStorage } from '../lib/storage/event-storage-construct';


test('test Text Analysis Fireshose Stream Creation', () => {
    const stack = new Stack();
    new TopicAnalysisProxy(stack, 'TestTAProxy', {
        topicsStorage: new EventStorage(stack, 'Topic', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: '/topic',
            s3Bucket: new Bucket(stack, 'topics', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        topicMappingsStorage: new EventStorage(stack, 'Mappings', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: '/mappings',
            s3Bucket: new Bucket(stack, 'mappingsbucket', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        topicMappingsInfNS: 'com.analyze.inferece.topic',
        topicsAnalysisInfNS: 'com.analyze.inference.mapping'

    });
    });
