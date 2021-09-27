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
const DataCleanse = require('./util/data-cleanse');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const translate = new AWS.Translate(awsCustomConfig);
    const kinesisFirehose = new AWS.Firehose(awsCustomConfig);
    const stepfunctions = new AWS.StepFunctions(awsCustomConfig);

    const translatedOutputs = [];
    for (const record of event.Records) {

        const message = JSON.parse(record.body);
        const input = message.input;

        const feed = input.feed;

        try {
            if (feed.lang !== 'en' && feed.lang !== 'und') {
                let sourceLanguageCode;

                // mapping between twitter provided lang code and that supported by Amazon Comprehend
                if ( feed.lang === 'zh-cn' )
                    sourceLanguageCode = 'zh';
                else if ( feed.lang === 'zh-tw' )
                    sourceLanguageCode = 'zh-TW';
                else sourceLanguageCode = feed.lang;

                const response = await translate.translateText({
                    Text: feed.text,
                    SourceLanguageCode: sourceLanguageCode,
                    TargetLanguageCode: 'en'
                }).promise();
                feed._translated_text = response.TranslatedText;
            } else { // twitter indicated that the text is in english, save Translate call.
                feed._translated_text = feed.text
            }

            // cleansing tweet text
            feed._cleansed_text =  DataCleanse.cleanText(feed._translated_text); // this version remains in the event object

            // build the arrary of records to push to S3 using Kinesis
            const data = [];
            data.push ({
                Data: `${feed.id_str},${DataCleanse.removeHashtags(DataCleanse.removeUsers(feed._cleansed_text))}\n` // further cleansed for topic modeling
            });

            // Only cleaning and inserting embedded text, no translation
            if (input.text_in_images !== undefined && input.text_in_images.length > 0) {
                const textInImgs = input.text_in_images;

                for (let index = 0; index < textInImgs.length; ++index) {
                    textInImgs[index]._cleansed_text = DataCleanse.cleanText(textInImgs[index].text); // this record remains in the event object
                    data.push({
                        Data: `${feed.id_str},${DataCleanse.removeHashtags(DataCleanse.removeUsers(textInImgs[index]._cleansed_text))}\n` // further cleansed for topic modeling only
                    });
                }
            }

            const keys = Object.keys(process.env);
            for (const key of keys) {
                if (key.includes('KINESIS_FIREHOSE_FOR_')) {
                    if (key.split('_').pop().toLowerCase() === input.platform.toLowerCase()) {
                        await kinesisFirehose.putRecordBatch({
                            DeliveryStreamName: process.env[key],
                            Records: data
                        }).promise();
                    }
                }
            }

            const params = {
                output: JSON.stringify(input),
                taskToken: message.taskToken
            };

            await stepfunctions.sendTaskSuccess(params).promise();
            translatedOutputs.push(input);
            return translatedOutputs;

        } catch (error) {
            console.error(`Task failed for platform:${input.platform}, account_name:${input.account_name}, id:${feed.id_str}, with error: ${error.message}`, error);
            await taskFailed(stepfunctions, error, message.taskToken);
        }
    }
}

async function taskFailed (stepfunctions, error, taskToken) {
    try {
        await stepfunctions.sendTaskFailure({
            taskToken: taskToken,
            cause: error.message,
            error: error.code
        }).promise();
    } catch(error) {
        console.error(`Error sending failed status for taskToken ${taskToken}`);
        throw error;
    }
}