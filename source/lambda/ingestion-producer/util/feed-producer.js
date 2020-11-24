/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                      *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

const AWS = require('aws-sdk');

AWS.config.region = process.env.AWS_REGION;

class FeedProducer {

    constructor () {
        this.kinesisStream = new AWS.Kinesis();
    }

    async writeToStream (data, props) {
        let dataRecords = [];
        if (data.length > 0) {
            data.forEach((record, index) => {
                const message = {
                    account_name: props.accountName,
                    platform: props.platform,
                    search_query: props.query,
                    feed: record
                }

                dataRecords.push({
                    Data: JSON.stringify(message),
                    PartitionKey: record.id_str
                });
            });

            const response = await this.kinesisStream.putRecords({
                Records: dataRecords,
                StreamName: process.env.STREAM_NAME
            }).promise();

            return response;
        }
    }
}

module.exports = FeedProducer;
