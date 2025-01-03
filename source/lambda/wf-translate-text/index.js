/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { FirehoseClient, PutRecordBatchCommand } = require('@aws-sdk/client-firehose'),
    { SFNClient: StepFunctions, SendTaskFailureCommand, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn'),
    { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');
const DataCleanse = require('./util/data-cleanse');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const kinesisFirehose = new FirehoseClient(awsCustomConfig);
    const stepfunctions = new StepFunctions(awsCustomConfig);

    const translatedOutputs = [];
    for (const record of event.Records) {
        const message = JSON.parse(Buffer.from(record.body).toString());
        const input = message.input;

        const feed = input.feed;

        try {
            feed._translated_text = await getTranslatedText(feed);

            // cleansing tweet text
            feed._cleansed_text = DataCleanse.cleanText(feed._translated_text); // this version remains in the event object

            // build the arrary of records to push to S3 using Kinesis
            const data = [];
            data.push({
                Data: Buffer.from(`${feed.id_str},${feed._cleansed_text}\n`) // further cleansed for topic modeling
            });

            // Only cleaning and inserting embedded text, no translation
            if (input.text_in_images !== undefined && input.text_in_images.length > 0) {
                const textInImgs = input.text_in_images;

                for (let index = 0; index < textInImgs.length; ++index) {
                    textInImgs[index]._cleansed_text = DataCleanse.cleanText(textInImgs[index].text); // this record remains in the event object
                    data.push({
                        Data: Buffer.from(`${feed.id_str},${textInImgs[index]._cleansed_text}\n`) // further cleansed for topic modeling only
                    });
                }
            }

            const keys = Object.keys(process.env);
            for (const key of keys) {
                if (
                    key.includes('KINESIS_FIREHOSE_FOR_') &&
                    key.split('_').pop().toLowerCase() === input.platform.toLowerCase()
                ) {
                    await kinesisFirehose.send(
                        new PutRecordBatchCommand({
                            DeliveryStreamName: process.env[key],
                            Records: data
                        })
                    );
                }
            }

            const params = {
                output: JSON.stringify(input),
                taskToken: message.taskToken
            };

            await stepfunctions.send(new SendTaskSuccessCommand(params));
            translatedOutputs.push(input);
            return translatedOutputs;
        } catch (error) {
            console.error(
                `Task failed for platform:${input.platform}, account_name:${input.account_name}, id:${feed.id_str}, with error: ${error.message}`,
                error
            );
            await taskFailed(stepfunctions, error, message.taskToken);
        }
    }
};

async function taskFailed(stepfunctions, errorDetails, taskToken) {
    try {
        await stepfunctions.send(
            new SendTaskFailureCommand({
                taskToken: taskToken,
                cause: errorDetails.message,
                error: errorDetails.code
            })
        );
    } catch (error) {
        console.error(`Error sending failed status for taskToken ${taskToken}`);
        throw error;
    }
}

async function getTranslatedText(feed) {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const translate = new TranslateClient(awsCustomConfig);
    if (feed.lang !== 'en' && feed.lang !== 'und') {
        let sourceLanguageCode;

        // mapping between twitter provided lang code and that supported by Amazon Comprehend
        if (feed.lang === 'zh-cn') sourceLanguageCode = 'zh';
        else if (feed.lang === 'zh-tw') sourceLanguageCode = 'zh-TW';
        else sourceLanguageCode = feed.lang;

        const response = await translate.send(
            new TranslateTextCommand({
                Text: feed.text,
                SourceLanguageCode: sourceLanguageCode,
                TargetLanguageCode: 'en'
            })
        );
        return response.TranslatedText;
    } else {
        // twitter indicated that the text is in english, save Translate call.
        return feed.text;
    }
}
