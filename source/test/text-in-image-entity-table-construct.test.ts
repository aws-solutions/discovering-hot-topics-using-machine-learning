/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/


import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { TextInImgEntityTable } from '../lib/visualization/text-in-image-entities-table-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();

    new TextInImgEntityTable (stack, 'ImgTxtEntity', {
        s3BucketPrefix: 'txtinimgentity/',
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmedia'
        }),
        tableName: 'txtinimgentity'
    });
});