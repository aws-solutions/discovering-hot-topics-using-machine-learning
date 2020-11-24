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

exports.handler = async (event) => {
    const comprehend = new AWS.Comprehend({region: process.env.AWS_REGION});

    await analyzeText(event, event.feed);

    if (event.text_in_images !== undefined && event.text_in_images.length > 0) {
        //text_in_images is an array of embedded sentence found in an image. Each index element in the array
        // corresponds to an image. The cleansed_text element is the complete sentence that was constructed by
        // using the detectText API of Rek
        for (let index = 0; index < event.text_in_images.length; ++index) {
            await analyzeText(event.text_in_images[index], event.text_in_images[index]);
        }
    }

    console.debug(`Analyzed event with id_str ${JSON.stringify(event.feed.id_str)}`);
    return event;
};


/**
 * This method analyzes the text in the underlying node element and returns output for the 3 key things that
 * Comprehend provides, sentiment analysis, key phrase detection, entity detection.
 *
 * The first parameter is the json to which the inferences should be appended to. The second parameter is the json that
 * has the data to analyze
 *
 * @param {*} element
 * @param {*} targetElement
 */
const analyzeText = async(targetElement, elementToAnalyze) => {
    const comprehend = new AWS.Comprehend();

    if (elementToAnalyze._cleansed_text.length > 0) {

        Promise.all([
            targetElement = Object.assign(targetElement, await comprehend.detectSentiment({
                Text: elementToAnalyze._cleansed_text,
                LanguageCode: 'en'
            }).promise().catch((error) => {
                console.error('Error when performing sentiment analysis', error);
                throw error;
            })),
            targetElement = Object.assign(targetElement, await comprehend.detectKeyPhrases({
                Text: elementToAnalyze._cleansed_text,
                LanguageCode: 'en'
            }).promise().catch((error) => {
                console.error('Error when performing keyphrase detection', error);
                throw error;
            })),
            targetElement = Object.assign(targetElement, await comprehend.detectEntities({
                Text: elementToAnalyze._cleansed_text,
                LanguageCode: 'en'
            }).promise().catch((error) => {
                console.error('Error when performing detect entities', error);
                throw error;
            }))
        ]);
    }

    return targetElement;
}