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
import { Database, DataFormat, Schema, Table } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { StorageCrawler } from '../lib/storage/storage-crawler-construct';


test('test orchestration construct', () => {
    const stack = new cdk.Stack();

    const db = new Database(stack, 'testDB', {
        databaseName: 'testDB'
    });

    const testBucket = new Bucket(stack, 'testBucket');

    const storageCofig: Map<string, string> = new Map();

        storageCofig.set('Sentiment', new Table(stack, 'sentiment', {
            tableName: 'sentiment',
            database: db,
            bucket: testBucket,
            s3Prefix: 'sentiment/',
            columns: [{
                name: 'field1',
                type: Schema.STRING
            }, {
                name: 'field2',
                type: Schema.STRING
            }],
            dataFormat: DataFormat.PARQUET,
            storedAsSubDirectories: true,
            partitionKeys: [{
                name: 'created_at',
                type: Schema.TIMESTAMP
            }]
        }).tableName);
        storageCofig.set('Entity', new Table(stack, 'entity', {
            tableName: 'entity',
            database: db,
            bucket: testBucket,
            s3Prefix: 'entity/',
            columns: [{
                name: 'field1',
                type: Schema.STRING
            }, {
                name: 'field2',
                type: Schema.STRING
            }],
            dataFormat: DataFormat.PARQUET,
            storedAsSubDirectories: true,
            partitionKeys: [{
                name: 'created_at',
                type: Schema.TIMESTAMP
            }]
        }).tableName);

    new StorageCrawler (stack, 'DatabaseCrawler', {
        s3Bucket: testBucket,
        databaseName: db.databaseName,
        keyArn: 'arn:aws:kms:fakeregion:fakeaccountid:kms/testkey',
        tableMap: storageCofig
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});