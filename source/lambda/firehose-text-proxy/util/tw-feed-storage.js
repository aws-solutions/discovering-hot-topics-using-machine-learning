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

class TwRawStorage {
    static storeTweets = async (data) => {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        const kinesisFireshose = new AWS.Firehose(awsCustomConfig);

        const rawTwFeed = {
            account_name: data.account_name,
            platform: data.platform,
            ...(data.feed),
            db_created_at: moment.utc(data.feed.created_at, timeformat.twitterTimestampFormat).format(timeformat.dbTimestampFormat)
        };

        console.debug(`Raw tweet: ${JSON.stringify(rawTwFeed)}`);

        await kinesisFireshose.putRecord({
            DeliveryStreamName: process.env.TW_FEED_STORAGE,
            Record: {
                Data: `${JSON.stringify(rawTwFeed)}\n`
            }
        }).promise();
    }
}

module.exports = TwRawStorage;