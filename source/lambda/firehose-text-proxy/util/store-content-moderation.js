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

'use strict';

const { FirehoseClient, PutRecordBatchCommand } = require('@aws-sdk/client-firehose');
const CustomConfig = require('aws-nodesdk-custom-config');

class ModerationLabels {
    static storeLabels = async (data) => {
        if (data.moderation_labels_in_imgs !== undefined && data.moderation_labels_in_imgs.length > 0) {
            const awsCustomConfig = CustomConfig.customAwsConfig();
            const kinesisFireshose = new FirehoseClient(awsCustomConfig);

            const labelsRecords = [];

            data.moderation_labels_in_imgs.forEach((image) => {
                image.labels.forEach((label) => {
                    const labelsData = JSON.stringify({
                        account_name: data.account_name,
                        platform: data.platform,
                        search_query: data.search_query,
                        id_str: data.feed.id_str,
                        created_at: data.feed.created_at,
                        image_url: image.image_url,
                        label_name: label.Name,
                        confidence: label.Confidence
                    });
                    labelsRecords.push({
                        Data: Buffer.from(`${labelsData}\n`)
                    });
                });
            });

            await kinesisFireshose.send(
                new PutRecordBatchCommand({
                    DeliveryStreamName: process.env.MODERATION_LABELS_FIREHOSE,
                    Records: labelsRecords
                })
            );
        }
    };
}

module.exports = ModerationLabels;
