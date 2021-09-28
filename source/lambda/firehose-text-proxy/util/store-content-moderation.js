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

class ModerationLabels {
    static storeLabels = async(data) => {

        if (data.moderation_labels_in_imgs !== undefined && data.moderation_labels_in_imgs.length > 0) {
            const awsCustomConfig = CustomConfig.customAwsConfig();
            const kinesisFireshose = new AWS.Firehose(awsCustomConfig);

            const labelsRecords = [];

            data.moderation_labels_in_imgs.forEach((image) => {
                image.labels.forEach((label) => {
                    labelsRecords.push({
                        Data: `${JSON.stringify({
                            account_name: data.account_name,
                            platform: data.platform,
                            search_query: data.search_query,
                            id_str: data.feed.id_str,
                            created_at: moment.utc(data.feed.created_at, timeformat.twitterTimestampFormat).format(timeformat.dbTimestampFormat),
                            image_url: image.image_url,
                            label_name: label.Name,
                            confidence: label.Confidence
                        })}\n`
                    });
                });
            });

            await kinesisFireshose.putRecordBatch({
                DeliveryStreamName: process.env.MODERATION_LABELS_FIREHOSE,
                Records: labelsRecords
            }).promise();
        }
    }
}

module.exports = ModerationLabels;