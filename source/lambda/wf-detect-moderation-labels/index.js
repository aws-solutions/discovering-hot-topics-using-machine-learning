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

    if (event.feed.entities !== undefined) {
        const bucketName = process.env.S3_BUCKET_NAME;
        const mediaArray = StreamAnalyzer.getMediaEntity(event.feed);
        const moderationLables = [];

        if (mediaArray !== undefined) {
            for (const media of mediaArray) {
                const mediaUrl = StreamAnalyzer.getMediaUrl(media);
                try {
                    console.debug(`Dump media information ${JSON.stringify(media)}`);
                    console.debug(`Media Url ${mediaUrl}`);
                    console.debug(`Bucket location ${bucketName}/${event.feed.id_str}/${path.basename(url.parse(String(mediaUrl)).pathname)}`);
                    const response = await rek.detectModerationLabels({
                        Image: {
                            S3Object: {
                                Bucket: bucketName,
                                Name: event.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)
                            }
                        }
                    }).promise();

                    console.debug(`Response from Rek call is ${JSON.stringify(response)}`);

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
                } catch(error) {
                    // Not rethrowing the error because the cleanup statements below should be executed. Also the statements
                    // are in a loop, if one image fails, there may be other images to detect, so continue further
                    console.error(`Error when calling Rek moderation label for ${event.feed.id_str}/${path.basename(url.parse(String(mediaUrl)).pathname)}`, error);
                }
            }
        }

        event.moderation_labels_in_imgs = moderationLables;
        console.debug(`Deleting media asset ${event.feed.id_str} in bucket ${bucketName}`);
        const emptyBucketResponse = await new ImageExtractor().emptyBucket(bucketName, event.feed.id_str);
        console.debug(`Response received for emptying bucket ${emptyBucketResponse}`);
    }

    return event;
}