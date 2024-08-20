/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/


import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { TextInImgKeyPhraseTable } from '../lib/visualization/text-in-img-keyphrase-table-construct';


test('test workflow stack', () => {
    const stack = new cdk.Stack();
    new TextInImgKeyPhraseTable (stack, 'TxtImgKeyPhraseTable', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        s3BucketPrefix: 'imgtxtkeyphrase/',
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmediadb'
        }),
        tableName: 'imgtxtkeyphrase'
    });
});