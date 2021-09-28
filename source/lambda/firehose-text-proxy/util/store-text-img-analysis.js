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
const moment = require('moment');
const timeformat = require('./time-stamp-format');
const CustomConfig = require('aws-nodesdk-custom-config');

class ImageAnalysis {
    static storeTextFromImage = async(data) => {

        if (data.text_in_images !== undefined && data.text_in_images.length > 0) {
            const awsCustomConfig = CustomConfig.customAwsConfig();
            const kinesisFireshose = new AWS.Firehose(awsCustomConfig);

            const txtInImgs = data.text_in_images? data.text_in_images : []; // empty array if the data feed does not have the array
            const txtInImgSentimentRecords = [];
            const txtInImgEntityRecords = [];
            const txtInImgKeyPhrasesRecords = [];
            txtInImgs.forEach((txt_in_img) => {
                if (txt_in_img.Sentiment !== undefined) {
                    txtInImgSentimentRecords.push({
                        Data: `${JSON.stringify({
                            account_name: data.account_name,
                            platform: data.platform,
                            search_query: data.search_query,
                            id_str: data.feed.id_str,
                            created_at: moment.utc(data.feed.created_at, timeformat.twitterTimestampFormat).format(timeformat.dbTimestampFormat),
                            text: txt_in_img.text,
                            image_url: txt_in_img.image_url,
                            sentiment: txt_in_img.Sentiment,
                            sentimentposscore: txt_in_img.SentimentScore.Positive,
                            sentimentnegscore: txt_in_img.SentimentScore.Negative,
                            sentimentneuscore: txt_in_img.SentimentScore.Neutral,
                            sentimentmixscore: txt_in_img.SentimentScore.Mixed
                        })}\n`
                    });
                }

                txt_in_img.Entities.forEach((entity) => {
                    if (entity.Text !== undefined) {
                        txtInImgEntityRecords.push({
                            Data: `${JSON.stringify({
                                account_name: data.account_name,
                                platform: data.platform,
                                search_query: data.search_query,
                                id_str: data.feed.id_str,
                                created_at: moment.utc(data.feed.created_at, timeformat.twitterTimestampFormat).format(timeformat.dbTimestampFormat),
                                text: txt_in_img.text,
                                image_url: txt_in_img.image_url,
                                entity_text: entity.Text,
                                entity_type: entity.Type,
                                entity_score: entity.Score,
                                entity_begin_offset: entity.BeginOffset,
                                entity_end_offset: entity.EndOffset
                            })}\n`
                        });
                    }
                });

                txt_in_img.KeyPhrases.forEach((keyPhrase) => {
                    if (keyPhrase.Text !== undefined)  {
                        txtInImgKeyPhrasesRecords.push({
                            Data: `${JSON.stringify({
                                account_name: data.account_name,
                                platform: data.platform,
                                search_query: data.search_query,
                                id_str: data.feed.id_str,
                                created_at: moment.utc(data.feed.created_at, timeformat.twitterTimestampFormat).format(timeformat.dbTimestampFormat),
                                text: txt_in_img.text,
                                image_url: txt_in_img.image_url,
                                phrase: keyPhrase.Text,
                                phrase_score: keyPhrase.Score,
                                phrase_begin_offset: keyPhrase.BeginOffset,
                                phrase_end_offset: keyPhrase.EndOffset
                            })}\n`
                        });
                    }
                });
            });

            await kinesisFireshose.putRecordBatch({
                DeliveryStreamName: process.env.TXT_IN_IMG_SENTIMENT_FIREHOSE,
                Records: txtInImgSentimentRecords
            }).promise();

            if ( txtInImgEntityRecords.length > 0 ) {
                await kinesisFireshose.putRecordBatch({
                    DeliveryStreamName: process.env.TXT_IN_IMG_ENTITY_FIREHOSE,
                    Records: txtInImgEntityRecords
                }).promise();
            }

            if ( txtInImgKeyPhrasesRecords.length > 0 ) {
                await kinesisFireshose.putRecordBatch({
                    DeliveryStreamName: process.env.TXT_IN_IMG_KEYPHRASE_FIREHOSE,
                    Records: txtInImgKeyPhrasesRecords
                }).promise();
            }
        }
    }
}

module.exports = ImageAnalysis;