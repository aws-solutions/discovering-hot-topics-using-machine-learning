/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICNSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/


import * as cdk from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { Database } from '@aws-cdk/aws-glue';
import { SynthUtils } from '@aws-cdk/assert';
import { ModerationLabelsTable } from '../lib/visualization/moderation-labels-table-construct';
import '@aws-cdk/assert/jest';

test('test workflow stack', () => {
    const stack = new cdk.Stack();
    new ModerationLabelsTable (stack, 'ModerationLabelsTabel', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        s3BucketPrefix: 'moderationlabel/',
        database: new Database(stack, 'TestDB', {
            databaseName: 'socialmediadb'
        })
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});