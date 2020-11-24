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
import { Database } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
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

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});