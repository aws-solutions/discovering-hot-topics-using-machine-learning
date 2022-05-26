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

const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.getCommentsTracker = async (subRedditName) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const ddb = new AWS.DynamoDB(awsCustomConfig);

    const ddbParams = {
        TableName: process.env.TARGET_DDB_TABLE,
        KeyConditionExpression: '#SUB_REDDIT = :subreddit',
        ExpressionAttributeNames: {
            '#SUB_REDDIT': 'SUB_REDDIT'
        },
        ExpressionAttributeValues: {
            ':subreddit': {
                S: subRedditName
            }
        }
    };

    try {
        const ddbResponse = await ddb.query(ddbParams).promise();
        if (ddbResponse.Items.length > 0) {
            const before = ddbResponse.Items[0].before.S;
            console.debug(`Before state for ${subRedditName} is ${before}`);
            return before;
        } else {
            console.debug(`No state found for ${subRedditName}, hence returning 0`);
            return '0';
        }
    } catch (ddbError) {
        console.error(
            `Error occured when trying to get subreddit tracker state from DynamoDB table, error is: ${JSON.stringify(
                ddbError
            )}`
        );
        throw ddbError;
    }
};
exports.updateCommentsTracker = async (subredditName, before) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const ddb = new AWS.DynamoDB(awsCustomConfig);

    const ddbParams = {
        TableName: process.env.TARGET_DDB_TABLE,
        Item: {
            SUB_REDDIT: { S: subredditName },
            before: { S: before }
        }
    };

    try {
        const ddbResponse = await ddb.putItem(ddbParams).promise();
        console.debug(`Response from updating comments tracker for ${subredditName}: ${JSON.stringify(ddbResponse)}`);
    } catch (error) {
        console.error(
            `Error occured updating comments tracker for subreddit ${subredditName}. Error is ${JSON.stringify(error)}`
        );

        throw error;
    }
};
