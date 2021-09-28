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

"use strict"

const AWS = require('aws-sdk');
const path = require('path');
const url = require('url');
const StreamAnalyzer = require('./util/stream-analyzer');
const ImageExtractor = require('./util/extract-image');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const rek = new AWS.Rekognition(awsCustomConfig);
    const stepfunctions = new AWS.StepFunctions(awsCustomConfig);

    const moderationLabelOutputs = [];

    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        const input = message.input;
        const moderationLables = [];

        try {
            if (input.feed.entities !== undefined) {
                const bucketName = process.env.S3_BUCKET_NAME;
                const mediaArray = StreamAnalyzer.getMediaEntity(input.feed);

                if (mediaArray !== undefined) {
                    for (const media of mediaArray) {
                        const mediaUrl = StreamAnalyzer.getMediaUrl(media);
                        try {
                            console.debug(`Dump media information ${JSON.stringify(media)}`);
                            console.debug(`Media Url ${mediaUrl}`);
                            console.debug(`Bucket location ${bucketName}/${input.feed.id_str}/${path.basename(url.parse(String(mediaUrl)).pathname)}`);
                            const response = await rek.detectModerationLabels({
                                Image: {
                                    S3Object: {
                                        Bucket: bucketName,
                                        Name: input.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)
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
                            console.error(`Error when calling Rek moderation label for ${input.feed.id_str}/${path.basename(url.parse(String(mediaUrl)).pathname)}`, error);
                            break; // skip to the next iteration if there are more images
                        }
                    }
                }

                console.debug(`Deleting media asset ${input.feed.id_str} in bucket ${bucketName}`);
                const emptyBucketResponse = await new ImageExtractor().emptyBucket(bucketName, input.feed.id_str);
                console.debug(`Response received for emptying bucket ${emptyBucketResponse}`);
            }

            input.moderation_labels_in_imgs = moderationLables;
            const params = {
                output: JSON.stringify(input),
                taskToken: message.taskToken
            };

            try {
                await stepfunctions.sendTaskSuccess(params).promise();
            } catch(error) {
                console.error(`Failed to publish successful message, params: ${JSON.stringify(params)}`, error);
                throw error;
            }

            moderationLabelOutputs.push(input);
        } catch (error) {
            console.error(`Task failed: ${error.message}`, error);
            await taskFailed(stepfunctions, error, message.taskToken);
        }
    }

    return moderationLabelOutputs;
}

async function taskFailed (stepfunctions, error, taskToken) {
    await stepfunctions.sendTaskFailure({
        taskToken: taskToken,
        cause: error.message,
        error: error.code
    }).promise();
}