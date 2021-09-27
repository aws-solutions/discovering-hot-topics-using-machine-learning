/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { Stack } from '@aws-cdk/core';
import { TextAnalysisProxy } from '../lib/integration/text-analysis-proxy';
import { EventStorage } from '../lib/storage/event-storage-construct';


test('test Text Analysis Fireshose Stream Creation', () => {
    const stack = new Stack();
    new TextAnalysisProxy(stack, 'TestTAProxy', {
        sentimentStorage: new EventStorage(stack, 'Sentiment', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: '/sentiment',
            s3Bucket: new Bucket(stack, 'testBucket')
        }),
        entityStorage: new EventStorage(stack, 'Entity', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'entity/',
            s3Bucket: new Bucket(stack, 'entitybucket', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        keyPhraseStorage: new EventStorage(stack, 'KeyPhrase', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'keyphrase/',
            s3Bucket: new Bucket(stack, 'keyphrasebucket', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        txtInImgEntityStorage: new EventStorage(stack, 'TxtInImgEntity', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'txtinimgentity/',
            s3Bucket: new Bucket(stack, 'txtinimgentity', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        txtInImgKeyPhraseStorage: new EventStorage(stack, 'TxtInImgKeyPhrase', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'txtinimgkeyphrase',
            s3Bucket: new Bucket(stack, 'txtinimgkeyphrase', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        txtInImgSentimentStorage: new EventStorage(stack, 'TxtImgSentiment', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'txtinimgsentiment',
            s3Bucket: new Bucket(stack, 'txtinimgsentiment', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        moderationLabelStorage: new EventStorage(stack, 'ModerationLabels', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'moderationLabel',
            s3Bucket: new Bucket(stack, 'moderationlabel', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        twFeedStorage: new EventStorage(stack, 'TwFeedStorage', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'feedStorage',
            s3Bucket: new Bucket(stack, 'twfeedstorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        newsFeedStorage: new EventStorage(stack, 'NewsFeedStorage', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'newsfeedStorage',
            s3Bucket: new Bucket(stack, 'newsFeedStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        youTubeCommentsStorage: new EventStorage(stack, 'YouTubeComments', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'youTubeComments',
            s3Bucket: new Bucket(stack, 'youTubeCommentsStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        textAnalysisInfNS: 'com.analyze.inference.text'
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
