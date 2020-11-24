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
    const s3 = new AWS.S3();
    const rek = new AWS.Rekognition({region: process.env.AWS_REGION});

    const sentences = [];

    if (event.feed.entities !== undefined) {
        const mediaArray = StreamAnalyzer.getMediaEntity(event.feed);
        const bucketName = process.env.S3_BUCKET_NAME;

        // console.debug (`Media urls are ${JSON.stringify(mediaArray)}`);
        if (mediaArray !== undefined) {
            for (let index = 0; index < mediaArray.length; ++index) {
                const mediaUrl = StreamAnalyzer.getMediaUrl(mediaArray[index]);
                try {
                    await ImageExtractor.retrieveImageAndS3Upload (mediaUrl, bucketName, event.feed.id_str);
                } catch(error) {
                    console.error('Error in uploading image', JSON.stringify(error));
                    throw error;
                }

                console.debug(`Bucket name is ${bucketName} Bucket prefix for image is ${event.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)}`);
                try {
                    const response = await rek.detectText({
                        Image: {
                            S3Object: {
                                Bucket: bucketName,
                                Name: event.feed.id_str+'/'+path.basename(url.parse(String(mediaUrl)).pathname)
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
                        };

                        const sentence = lines.join(' ');
                        console.debug(`The line is ${sentence}`);

                        if (sentence !== '') { // only add the line to the sentence if its not empty
                            sentences.push({
                                image_url: mediaUrl,
                                text: sentence
                            });
                        }
                    };
                    console.debug(`The sentence is ${JSON.stringify(sentences)}`);
                } catch(error) {
                    console.error('error in extracting text', JSON.stringify(error));
                    throw error;
                }
            }
        }
    }
    event.text_in_images = sentences;
    // console.debug(`Final event is ${JSON.stringify(event)}`);

    return event;
}
