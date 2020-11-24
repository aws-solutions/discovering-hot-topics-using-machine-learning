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
import { Bucket } from '@aws-cdk/aws-s3';
import { Stack } from '@aws-cdk/core';
import { EventStorage } from '../lib/storage/event-storage-construct';


test ('Event Storage Construct with props', () => {
    const stack = new Stack();
    new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'UNCOMPRESSED',
        prefix: 'test-prefix/',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test ('Event Storage Construct without props', () => {
    const stack = new Stack();
    const eventStorage = new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'GZIP',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test ('Event Storage Construct with Lambda processor', () => {
    const stack = new Stack();
    const eventStorage = new EventStorage(stack, 'EventStorageTest', {
        compressionFormat: 'GZIP',
        processor: true,
        prefix: 'testPrefix/',
        s3Bucket: new Bucket(stack, 'testBucket')
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});