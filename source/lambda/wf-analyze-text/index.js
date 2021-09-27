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
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const stepfunctions = new AWS.StepFunctions(awsCustomConfig);

    const analyzedTextoutputs = [];

    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        const input = message.input;

        try {
            console.debug(`Analyzing event with id_str ${input.feed.id_str}, on platform ${input.platform} and account name ${input.account_name}`);
            await analyzeText(input, input.feed);

            if (input.text_in_images !== undefined && input.text_in_images.length > 0) {
                //text_in_images is an array of embedded sentence found in an image. Each index element in the array
                // corresponds to an image. The cleansed_text element is the complete sentence that was constructed by
                // using the detectText API of Rek
                for (let index = 0; index < input.text_in_images.length; ++index) {
                    await analyzeText(input.text_in_images[index], input.text_in_images[index]);
                }
            }

            console.debug(`Analyzed event with id_str ${input.feed.id_str}, on platform ${input.platform} and account name ${input.account_name}`);
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

            analyzedTextoutputs.push(input);
        } catch(error) {
            console.error(`Task failed: ${error.message}`, error);
            await taskFailed(stepfunctions, error, message.taskToken);
        }
    }

    return analyzedTextoutputs;
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
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const comprehend = new AWS.Comprehend(awsCustomConfig);

    if (elementToAnalyze._cleansed_text.length > 0) {

        Promise.all([
            targetElement = Object.assign(targetElement, await detectSentiment(comprehend, elementToAnalyze._cleansed_text)),
            targetElement = Object.assign(targetElement, await comprehend.detectKeyPhrases({
                Text: elementToAnalyze._cleansed_text,
                LanguageCode: 'en'
            }).promise().catch((error) => {
                console.error(`Error when performing keyphrase detection on ${elementToAnalyze._cleansed_text}`, error);
                throw error;
            })),
            targetElement = Object.assign(targetElement, await comprehend.detectEntities({
                Text: elementToAnalyze._cleansed_text,
                LanguageCode: 'en'
            }).promise().catch((error) => {
                console.error(`Error when performing detect entities on ${elementToAnalyze._cleansed_text}`, error);
                throw error;
            }))
        ]);
    } else {
        // Step function merge JSON expects that sentiment key should always be present.
        // creating an empty sentiment to remove step function merge errors.
        targetElement.Sentiment = '';
        targetElement.SentimentScore = {};
        targetElement.KeyPhrases = [];
        targetElement.Entities = [];
    }

    return targetElement;
}


const detectSentiment = async (comprehend, text) => {
    let response;
    if (text.length > 0) {
        response = await comprehend.detectSentiment({
            Text: text,
            LanguageCode: 'en'
        }).promise().catch((error) => {
            console.error(`Error when performing sentiment analysis for ${text}`, error);
            throw error;
        });
    }

    // Step function merge JSON expects that sentiment key should always be present.
    // creating an empty sentiment to remove step function merge errors.
    if (response === undefined) {
        return {
            Sentiment: '',
            SentimentScore: {}
        };
    }

    return response;
}

async function taskFailed (stepfunctions, error, taskToken) {
    await stepfunctions.sendTaskFailure({
        taskToken: taskToken,
        cause: error.message,
        error: error.code
    }).promise();
}