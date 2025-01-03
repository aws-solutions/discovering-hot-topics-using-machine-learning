/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { RekognitionClient, DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition'),
    { SFNClient: StepFunctions, SendTaskSuccessCommand, SendTaskFailureCommand } = require('@aws-sdk/client-sfn');
const path = require('path');
const { URL } = require('url');
const StreamAnalyzer = require('./util/stream-analyzer');
const ImageExtractor = require('./util/extract-image');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const stepfunctions = new StepFunctions(awsCustomConfig);

    const moderationLabelOutputs = [];

    for (const record of event.Records) {
        const message = JSON.parse(Buffer.from(record.body).toString());
        const input = message.input;
        let moderationLables = [];

        try {
            if (input.feed.entities !== undefined) {
                const bucketName = process.env.S3_BUCKET_NAME;
                const mediaArray = StreamAnalyzer.getMediaEntity(input.feed);
                if (mediaArray !== undefined) {
                    moderationLables = await processMedia(mediaArray, bucketName, input.feed.id_str);
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
                await stepfunctions.send(new SendTaskSuccessCommand(params));
            } catch (error) {
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

async function processMedia(mediaList, bucketName, inputFeedId) {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const rek = new RekognitionClient(awsCustomConfig);
    const moderationLables = [];
    for (const media of mediaList) {
        const mediaUrl = StreamAnalyzer.getMediaUrl(media);
        const parsed = new URL(String(mediaUrl));
        const pathName = parsed.pathname
        try {
            console.debug(`Dump media information ${JSON.stringify(media)}`);
            console.debug(`Media Url ${mediaUrl}`);
            console.debug(
                `Bucket location ${bucketName}/${inputFeedId}/${path.basename(pathName)}`
            );
            const response = await rek.send(
                new DetectModerationLabelsCommand({
                    Image: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: inputFeedId + '/' + path.basename(pathName)
                        }
                    }
                })
            );

            console.debug(`Response from Rek call is ${JSON.stringify(response)}`);

            if (response.ModerationLabels !== undefined && response.ModerationLabels.length > 0) {
                const labels = [];
                for (const label of response.ModerationLabels) {
                    labels.push({ Name: label.Name, Confidence: label.Confidence });
                }

                if (labels.length > 0) {
                    //only put moderation labels if Rek detected anything.
                    moderationLables.push({
                        image_url: mediaUrl,
                        labels: labels
                    });
                }
            }
        } catch (error) {
            // Not rethrowing the error because the cleanup statements below should be executed. Also the statements
            // are in a loop, if one image fails, there may be other images to detect, so continue further
            console.error(
                `Error when calling Rek moderation label for ${inputFeedId}/${path.basename(pathName)}`, error );
            break; // skip to the next iteration if there are more images
        }
    }
    return moderationLables;
}
