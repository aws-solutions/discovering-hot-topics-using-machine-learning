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

const FirehoseHelper = require('./firehose-helper');

class FeedStorage {
    static storeFeed = async (data) => {
        console.debug(`StoreFeed method: Data received: ${JSON.stringify(data)}`);

        const record = JSON.stringify({
            account_name: data.account_name,
            platform: data.platform,
            ...data.feed,
            created_at: data.feed.created_at
        });
        console.debug(`Raw feed: ${record}`);

        const response = await FirehoseHelper.putRecord(
            `${record}\n`,
            process.env[`${data.platform.toUpperCase()}_FEED_STORAGE`]
        );
        console.debug(`Response from writing record to firehose: ${JSON.stringify(response)}`);
    };

    /**
     * Since Amazon QuickSight does not support array as a data type. The storeFeed is not able to create a table that
     * is readable through QuickSight. This method's purpose is flatten the array and normalize the data.
     *
     * @param {*} data
     */
    static trascribeFeed = async (data) => {
        console.debug(`TranscribeFee: Data received: ${JSON.stringify(data)}`);
        if (data.feed.hasOwnProperty('LoudnessScores')) {
            const scoreArray = [];
            data.feed.LoudnessScores.forEach((score) => {
                scoreArray.push({
                    Data: `${JSON.stringify({
                        platform: data.platform,
                        account_name: data.account_name,
                        parent_id: data.feed.parent_id,
                        id_str: data.feed.id_str,
                        score: score,
                        created_at: data.feed.created_at
                    })}\n`
                });
            });

            if (scoreArray.length > 0) {
                const loudnessResponse = await FirehoseHelper.putRecordBatch(
                    scoreArray,
                    process.env[`${data.platform.toUpperCase()}LOUDNESS_FEED_STORAGE`]
                );
                console.debug(`Response from writing LoudnessScores to firehose: ${JSON.stringify(loudnessResponse)}`);
            } else {
                console.debug('No Loudness Scores found in data');
            }
        }

        if (data.feed.hasOwnProperty('Items')) {
            const itemsArray = [];
            data.feed.Items.forEach((item) => {
                itemsArray.push({
                    Data: `${JSON.stringify({
                        platform: data.platform,
                        account_name: data.account_name,
                        parent_id: data.feed.parent_id,
                        id_str: data.feed.id_str,
                        Type: item.Type,
                        Confidence: item.Confidence,
                        Content: item.Content,
                        BeginOffsetMillis: item.BeginOffsetMillis,
                        EndOffsetMillis: item.EndOffsetMillis,
                        created_at: data.feed.created_at
                    })}\n`
                });
            });

            if (itemsArray.length > 0) {
                const itemResponse = await FirehoseHelper.putRecordBatch(
                    itemsArray,
                    process.env[`${data.platform.toUpperCase()}ITEM_FEED_STORAGE`]
                );
                console.debug(`Response from writing Items to firehose: ${JSON.stringify(itemResponse)}`);
            } else {
                console.debug('No items found in data');
            }
        }
    };
}

module.exports = FeedStorage;
