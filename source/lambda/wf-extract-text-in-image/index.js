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

    const outputs = [];

    for (const record of event.Records) {

        const message = JSON.parse(record.body);
        const input = message.input;
        const sentences = [];

        try {
            if (input.feed.entities !== undefined) {
                const mediaArray = StreamAnalyzer.getMediaEntity(input.feed);
                const bucketName = process.env.S3_BUCKET_NAME;

                console.debug (`Media urls are ${JSON.stringify(mediaArray)}`);
                if (mediaArray !== undefined) {
                    for (let index = 0; index < mediaArray.length; ++index) {
                        const mediaUrl = StreamAnalyzer.getMediaUrl(mediaArray[index]);
                        try {
                            await ImageExtractor.retrieveImageAndS3Upload(mediaUrl, bucketName, input.feed.id_str);
                        } catch(error) {
                            console.error(`Error in uploading image for ${mediaUrl} and id ${input.feed.id_str}`, JSON.stringify(error));
                            break; // skip to the next iteration if there are more images
                        }

                        console.debug(`Bucket name is ${bucketName} Bucket prefix for image is ${input.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)}`);
                        try {
                            const _s3Key = input.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname);
                            console.debug(`Key to retrieving image from bucket ${_s3Key}`);
                            const response = await rek.detectText({
                                Image: {
                                    S3Object: {
                                        Bucket: bucketName,
                                        Name: _s3Key
                                    }
                                }
                            }).promise();
                            console.debug(`Response from Rek text detection is ${JSON.stringify(response)}`);
                            if (response.TextDetections!== undefined) {
                                const lines = [];
                                const textDetections = response.TextDetections;
                                for (let detectionIndex = 0; detectionIndex < textDetections.length; ++detectionIndex) {
                                    if (textDetections[detectionIndex].Type === 'LINE' && textDetections[detectionIndex].DetectedText !== '' ) {
                                        lines.push(textDetections[detectionIndex].DetectedText);
                                    }
                                }

                                const sentence = lines.join(' ');
                                console.debug(`The line is ${sentence}`);

                                if (sentence !== '') { // only add the line to the sentence if its not empty
                                    sentences.push({
                                        image_url: mediaUrl,
                                        text: sentence
                                    });
                                }
                            }
                            console.debug(`The sentence is ${JSON.stringify(sentences)}`);
                        } catch(error) {
                            console.error('error in extracting text', JSON.stringify(error));
                            break; // skip to the next iteration
                        }
                    }
                }
            }
            input.text_in_images = sentences;
            const strRecord = JSON.stringify(input)
            const params = {
                output: strRecord,
                taskToken: message.taskToken
            };
            console.debug(`Final record is ${strRecord}`);

            try {
                await stepfunctions.sendTaskSuccess(params).promise();
            } catch(error) {
                console.error(`Failed to publish successful message, params: ${JSON.stringify(params)}`, error);
                throw error;
            }

            outputs.push(input);

        } catch (error) {
            console.error(`Task failed: ${error.message}`, error);
            await taskFailed(stepfunctions, error, message.taskToken);
        }
    }

    return outputs;
}

async function taskFailed (stepfunctions, error, taskToken) {
    await stepfunctions.sendTaskFailure({
        taskToken: taskToken,
        cause: error.message,
        error: error.code
    }).promise();
}
