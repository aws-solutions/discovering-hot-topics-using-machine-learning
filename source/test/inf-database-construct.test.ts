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
import { Key } from '@aws-cdk/aws-kms';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { InferenceDatabase } from '../lib/visualization/inf-database-construct';


test('test workflow stack', () => {
    const stack = new cdk.Stack();

    const storageCofig: Map<string, string> = new Map();
    storageCofig.set('Sentiment', 'sentiment');
    storageCofig.set('Entity', 'entity');
    storageCofig.set('Entity', 'entity');
    storageCofig.set('KeyPhrase', 'keyphrase');
    storageCofig.set('Topics', 'topics');
    storageCofig.set('TopicMappings', 'topic-mappings');
    storageCofig.set('TxtInImgEntity', 'txtinimgentity');
    storageCofig.set('TxtInImgSentiment', 'txtinimgsentiment');
    storageCofig.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
    storageCofig.set('ModerationLabels', 'moderationlabels');

    const s3AccessLoggingBucket = new Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    new InferenceDatabase(stack, 'TestDB', {
        s3InputDataBucket: new Bucket(stack, 'TestBucket'),
        tablePrefixMappings: storageCofig,
        glueKMSKey: new Key(stack, 'GlueCloudWatch', {
            enableKeyRotation: true
        }),
        s3LoggingBucket: s3AccessLoggingBucket
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});