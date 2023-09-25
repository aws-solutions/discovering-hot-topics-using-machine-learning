/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

const moment = require('moment');
const { KinesisClient, PutRecordsCommand } = require('@aws-sdk/client-kinesis');
const CustomConfig = require('aws-nodesdk-custom-config');

const twitterTimestampFormat = 'ddd MMM DD HH:mm:ss Z YYYY';
const dbTimestampFormat = 'YYYY-MM-DD HH:mm:ss';
class FeedProducer {
    constructor() {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.kinesisStream = new KinesisClient(awsCustomConfig);
    }

    async writeToStream(data, props) {
        let dataRecords = [];
        if (data.length > 0) {
            data.forEach((record, index) => {
                // changed the twitter search API call to include full text, this caused the API to retrun the tweet
                // as 'full_text' attribute. This is breaking rest of the solution.
                // Copy full_text to text, as the rest of the solution expects the tweet as 'text' attribute.
                record['text'] = record['full_text'];
                record['created_at'] = moment.utc(record.created_at, twitterTimestampFormat).format(dbTimestampFormat);
                const message = {
                    account_name: props.accountName,
                    platform: props.platform,
                    search_query: props.query,
                    feed: record
                };

                console.debug(`Writing tweet: ${JSON.stringify(message)}`);

                dataRecords.push({
                    Data: Buffer.from(JSON.stringify(message)),
                    PartitionKey: record.id_str
                });
            });

            return this.kinesisStream.send(
                new PutRecordsCommand({
                    Records: dataRecords,
                    StreamName: process.env.STREAM_NAME
                })
            );
        }
    }
}

module.exports = FeedProducer;
