/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { FirehoseClient, PutRecordCommand } = require('@aws-sdk/client-firehose');
const CustomConfig = require('aws-nodesdk-custom-config');

class TwRawStorage {
    static storeTweets = async (data) => {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        const kinesisFireshose = new FirehoseClient(awsCustomConfig);

        const rawTwFeed = {
            account_name: data.account_name,
            platform: data.platform,
            ...data.feed
        };

        console.debug(`Raw tweet: ${JSON.stringify(rawTwFeed)}`);

        await kinesisFireshose.send(
            new PutRecordCommand({
                DeliveryStreamName: process.env.TW_FEED_STORAGE,
                Record: {
                    Data: Buffer.from(`${JSON.stringify(rawTwFeed)}\n`)
                }
            })
        );
    };
}

module.exports = TwRawStorage;
