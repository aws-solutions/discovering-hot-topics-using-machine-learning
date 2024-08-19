/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { ModerationLabelsTable } from '../lib/visualization/moderation-labels-table-construct';

test('test workflow stack', () => {
    const stack = new cdk.Stack();
    new ModerationLabelsTable(stack, 'ModerationLabelsTable', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        s3BucketPrefix: 'moderationlabel/',
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmediadb'
        }),
        tableName: 'moderationlabel'
    });
});
