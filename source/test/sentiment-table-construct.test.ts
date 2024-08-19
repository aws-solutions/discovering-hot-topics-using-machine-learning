/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/


import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { SentimentTable } from '../lib/visualization/sentiment-table-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();
    new SentimentTable (stack, 'SentimentTable', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        s3BucketPrefix: 'sentiment/',
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmediadb'
        }),
        tableName: 'sentiment'
    });
});