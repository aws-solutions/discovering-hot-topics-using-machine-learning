/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { Template } from 'aws-cdk-lib/assertions';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Stack } from 'aws-cdk-lib';
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
        customIngestionStorage: new EventStorage(stack, 'Custom', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'customingestion',
            s3Bucket: new Bucket(stack, 'customIngestionStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        customIngestionLoudnessStorage: new EventStorage(stack, 'CustomIngestionLoudness', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'customingestionloudness',
            s3Bucket: new Bucket(stack, 'customIngestionLoudnessStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        customIngestionItemStorage: new EventStorage(stack, 'CustomIngestionItem', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'customingestionitem',
            s3Bucket: new Bucket(stack, 'customIngestionItemStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        textAnalysisInfNS: 'com.analyze.inference.text',
        metadataNS: 'metadata.call_analytics',
        metadataStorage: new EventStorage(stack, 'Metadata', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'metadata',
            s3Bucket: new Bucket(stack, 'metadataStorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        }),
        redditCommentsStorage: new EventStorage(stack, 'RedditComments', {
            compressionFormat: 'UNCOMPRESSED',
            prefix: 'redditcomments',
            s3Bucket: new Bucket(stack, 'redditcommentsstorage', {
                encryption: BucketEncryption.S3_MANAGED
            })
        })
    });
    });
