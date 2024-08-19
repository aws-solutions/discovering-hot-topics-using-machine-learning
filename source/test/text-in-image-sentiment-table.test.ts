/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/


import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { TextInImgSentimentTable } from '../lib/visualization/text-in-img-sentiment-table-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();
    new TextInImgSentimentTable (stack, 'TextInImgSentimentTable', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        s3BucketPrefix: 'textinimgsentiment/',
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmediadb'
        }),
        tableName: 'textinimgsentiment'
    });
});