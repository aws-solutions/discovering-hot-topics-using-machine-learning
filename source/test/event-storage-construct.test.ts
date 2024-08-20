/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Stack } from 'aws-cdk-lib';
import { EventStorage } from '../lib/storage/event-storage-construct';


test ('Event Storage Construct with props', () => {
    const stack = new Stack();
    new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'UNCOMPRESSED',
        prefix: 'test-prefix/',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    });

test ('Event Storage Construct without props', () => {
    const stack = new Stack();
    const eventStorage = new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'GZIP',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    });

test ('Event Storage Construct with Lambda processor', () => {
    const stack = new Stack();
    const eventStorage = new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'GZIP',
        processor: true,
        prefix: 'testPrefix/',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    });