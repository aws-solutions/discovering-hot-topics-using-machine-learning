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

const moment = require('moment');
const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.records = [];
exports.publishComment = async (comment, flush = false) => {
    comment['text'] = comment.body
        .replace(/(?:[\r\n]+)+/gm, ' ')
        .slice(0, 5000)
        .trim();
    comment['created_at'] = moment.unix(comment.created_utc).format('YYYY-MM-DD HH:mm:ss');
    comment['id_str'] = comment.name;

    this.records.push({
        Data: JSON.stringify({
            account_name: 'subreddit',
            platform: 'reddit',
            search_query: comment.subreddit_name_prefixed,
            feed: comment
        }),
        PartitionKey: comment.name
    });

    if (flush || this.records.length >= 10) {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        const kinesis = new AWS.Kinesis(awsCustomConfig);

        try {
            const response = await kinesis
                .putRecords({
                    Records: this.records,
                    StreamName: process.env.STREAM_NAME
                })
                .promise();
            console.debug(`Response from data stream is: ${JSON.stringify(response)}`);
        } catch (error) {
            console.error(`Error publishing records to Kinesis Data Streams. Error is: ${error}`);
            throw error;
        } finally {
            // even if records fail, flush the array so that it does not grow to cause resource constraints
            this.records = [];
        }
    }
};
