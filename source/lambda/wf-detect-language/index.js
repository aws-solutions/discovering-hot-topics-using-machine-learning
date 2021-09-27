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

    const outputs = []

    for (const  record of event.Records) {
        const message = JSON.parse(record.body);
        const input = message.input;

        try {
            const feed = input.feed;

            if (! feed.hasOwnProperty('lang') || feed.lang === 'und' || feed.lang === 'None') {
                const comprehend = new AWS.Comprehend(awsCustomConfig);
                const textToDetectLang = feed.text;

                // Comprehend only supports translation if the length is more than 20 characters
                if (textToDetectLang.length >=20 && Buffer.byteLength(textToDetectLang, 'utf-8') <= 5000) {

                    const response = await comprehend.detectDominantLanguage({
                        Text: textToDetectLang
                    }).promise();

                    if (response.error) {
                        console.error(`Error occured when detecting dominant language for text: ${textToDetectLang}. Setting default language. Error is ${response.error}`);
                        //falling back to a default language as set in the lambda environment variable or "en"'
                        feed.lang = process.env.DEFAULT_LANGAUGE ? process.env.DEFAULT_LANGAUGE : 'en';
                    } else {
                        const language = response.Languages[0];
                        console.log(`ID: ${feed.id_str}, Text: ${textToDetectLang}, Detected Language: ${language}, Score: ${language.Score}`);
                        feed.lang = language.LanguageCode;
                    }
                } else {
                    //falling back to a default language as set in the lambda environment variable or "en"'
                    feed.lang = process.env.DEFAULT_LANGAUGE ? process.env.DEFAULT_LANGAUGE : 'en';
                    console.warn(`text to translate is not in range for Amazon Comprehend. Text is: ${textToDetectLang}. Hence defaulting to ${feed.lang}`);
                }
            } else {
                console.warn(`Received feed with valid lang: ${feed.lang}`);
            }

            await stepfunctions.sendTaskSuccess({
                output: JSON.stringify(input),
                taskToken: message.taskToken
            }).promise();

            outputs.push(input);
        } catch (error) {
            console.error('Error occured in processing task', error);
            taskFailed(stepfunctions, error, message.taskToken);
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