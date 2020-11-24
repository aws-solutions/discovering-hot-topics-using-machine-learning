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
const DataCleanse = require('./util/data-cleanse');

exports.handler = async (event) => {
    const translate = new AWS.Translate();
    const kinesisFirehose = new AWS.Firehose();

    const feed = event.feed;

    if (feed.lang !== 'en') {
        let sourceLanguageCode;

        // mapping between twitter provided lang code and that supported by Amazon Comprehend
        if ( feed.lang === 'zh-cn' )
            sourceLanguageCode = 'zh';
        else if ( feed.lang === 'zh-tw' )
            sourceLanguageCode = 'zh-TW';
        else sourceLanguageCode = feed.lang;

        try {
            const response = await translate.translateText({
                Text: feed.text,
                SourceLanguageCode: sourceLanguageCode,
                TargetLanguageCode: 'en'
            }).promise();

            feed._translated_text = response.TranslatedText;
        } catch (error) {
            // added to check for Throttling issues from Translate
            console.error (`Error when translating ${feed.text} `, error);
            throw error;
        }
    } else { // twitter indicated that the text is in english
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
    if (event.text_in_images !== undefined && event.text_in_images.length > 0) {
        const textInImgs = event.text_in_images;

        for (let index = 0; index < textInImgs.length; ++index) {
            textInImgs[index]._cleansed_text = DataCleanse.cleanText(textInImgs[index].text); // this record remains in the event object
            data.push({
                Data: `${feed.id_str},${DataCleanse.removeHashtags(DataCleanse.removeUsers(textInImgs[index]._cleansed_text))}\n` // further cleansed for topic modeling only
            });
        }
    }

    try {
        await kinesisFirehose.putRecordBatch({
            DeliveryStreamName: process.env.KINESIS_FIREHOSE_NAME,
            Records: data
        }).promise();
    } catch (error) {
        // added to check if there are issues publishing to Kinesis Firehose
        console.error(`Error when publishing records on Kinesis Firehose ${feed.id_str},${feed._cleansed_text} `, error);
        throw error;
    }

    return event;
}