/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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
