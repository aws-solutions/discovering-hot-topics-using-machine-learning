/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { RedditCommentsTable } from '../lib/visualization/reddit-comments-table-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();

    new RedditCommentsTable(stack, 'RedditTable', {
        s3BucketPrefix: 'redditcomment/',
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmedia'
        }),
        tableName: 'redditcomment'
    });
});
