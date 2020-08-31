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

"use strict"

const AWS = require('aws-sdk');
const path = require('path');
const url = require('url');
const StreamAnalyzer = require('./util/stream-analyzer');
const ImageExtractor = require('./util/extract-image');

AWS.config.region = process.env.AWS_REGION;

exports.handler = async (event) => {
    const rek = new AWS.Rekognition({region: process.env.AWS_REGION});
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET_NAME;

    if (event.feed.entities !== undefined) {
        const mediaArray = StreamAnalyzer.getMediaEntity(event.feed);
        const moderationLables = [];

        if (mediaArray !== undefined) {
            for (const media of mediaArray) {
                const mediaUrl = StreamAnalyzer.getMediaUrl(media);
                const response = await rek.detectModerationLabels({
                    Image: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: event.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)
                        }
                    }
                }).promise();

                if (response.ModerationLabels !== undefined && response.ModerationLabels.length > 0) {
                    const labels = [];
                    for (const label of response.ModerationLabels) {
                        labels.push({Name: label.Name, Confidence: label.Confidence });
                    }

                    if (labels.length > 0) { //only put moderation labels if Rek detected anything.
                        moderationLables.push({
                            image_url: mediaUrl,
                            labels: labels
                        });
                    }
                }
            }
        }

        event.moderation_labels_in_imgs = moderationLables;
        await new ImageExtractor().emptyBucket(bucketName, event.feed.id_str)
    }

    return event;
}