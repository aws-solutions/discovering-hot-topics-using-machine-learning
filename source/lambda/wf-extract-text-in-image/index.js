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

'use strict';

const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition'),
    { SFNClient: StepFunctions, SendTaskSuccessCommand, SendTaskFailureCommand } = require('@aws-sdk/client-sfn');
const path = require('path');
const { URL } = require('url');

const StreamAnalyzer = require('./util/stream-analyzer');
const ImageExtractor = require('./util/extract-image');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const stepfunctions = new StepFunctions(awsCustomConfig);

    const outputs = [];

    for (const record of event.Records) {
        const message = JSON.parse(Buffer.from(record.body).toString());
        const input = message.input;
        let sentences = [];

        try {
            if (input.feed.entities !== undefined) {
                const mediaArray = StreamAnalyzer.getMediaEntity(input.feed);
                const bucketName = process.env.S3_BUCKET_NAME;

                console.debug(`Media urls are ${JSON.stringify(mediaArray)}`);
                if (mediaArray !== undefined) {
                    sentences = await processMedia(mediaArray, bucketName, input.feed.id_str);
                }
            }
            input.text_in_images = sentences;
            const strRecord = JSON.stringify(input);
            const params = {
                output: strRecord,
                taskToken: message.taskToken
            };
            console.debug(`Final record is ${strRecord}`);

            try {
                await stepfunctions.send(new SendTaskSuccessCommand(params));
            } catch (error) {
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
};

async function taskFailed(stepfunctions, error, taskToken) {
    await stepfunctions.send(
        new SendTaskFailureCommand({
            taskToken: taskToken,
            cause: error.message,
            error: error.name
        })
    );
}

async function processMedia(mediaArray, bucketName, inputFeedId) {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const rek = new RekognitionClient(awsCustomConfig);
    const sentences = [];
    for (const media of mediaArray) {
        const mediaUrl = StreamAnalyzer.getMediaUrl(media);
        const parsed = new URL(String(mediaUrl));
        const pathName = parsed.pathname
        try {
            await ImageExtractor.retrieveImageAndS3Upload(mediaUrl, bucketName, inputFeedId);
        } catch (error) {
            console.error(`Error in uploading image for ${mediaUrl} and id ${inputFeedId}`, JSON.stringify(error));
            break; // skip to the next iteration if there are more images
        }

        console.debug(
            `Bucket name is ${bucketName} Bucket prefix for image is ${
                inputFeedId + '/' + path.basename(pathName)
            }`
        );
        try {
            const _s3Key = inputFeedId + '/' + path.basename(pathName);
            console.debug(`Key to retrieving image from bucket ${_s3Key}`);
            const response = await rek.send(
                new DetectTextCommand({
                    Image: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: _s3Key
                        }
                    }
                })
            );
            console.debug(`Response from Rek text detection is ${JSON.stringify(response)}`);
            if (response.TextDetections === undefined) {
                continue;
            }
            const lines = [];
            const textDetections = response.TextDetections;
            for (const detectionElement of textDetections) {
                if (detectionElement.Type === 'LINE' && detectionElement.DetectedText !== '') {
                    lines.push(detectionElement.DetectedText);
                }
            }

            const sentence = lines.join(' ');
            console.debug(`The line is ${sentence}`);

            if (sentence !== '') {
                // only add the line to the sentence if its not empty
                sentences.push({
                    image_url: mediaUrl,
                    text: sentence
                });
            }

            console.debug(`The sentence is ${JSON.stringify(sentences)}`);
        } catch (error) {
            console.trace();
            console.error('error in extracting text', JSON.stringify(error));
            break; // skip to the next iteration
        }
    }
    return sentences;
}
