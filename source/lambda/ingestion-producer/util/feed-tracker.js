/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

"use strict"

const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');

class FeedTracker {

    constructor (accountName) {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.ddb = new AWS.DynamoDB(awsCustomConfig);
        this.accountName = accountName;
    }

    async getIDFromTracker(...args) {
        console.debug(`Account Identifier for tracker: ${this.accountName}#${args.join('#')}`);
        const response = await this.queryDDB(args);
        console.debug(`Result from ddb query ${JSON.stringify(response)}`);
        const items = response.Items;
        if (items.length > 0) { // check if there are any records in the tracker. The very first query on solution booting will return no records
            console.debug(`Found ID in DDB as ${JSON.stringify(items[0].MAX_ID)}`);
            return items[0].MAX_ID.S;
        } else {
            return 0;
        }
    }

    async queryDDB(...args) {
        const ddbParams = {
            TableName: process.env.DDB_TABLE_NAME,
            ProjectionExpression: "MAX_ID, CREATED_TIMESTAMP",
            Limit: 1,
            KeyConditionExpression: "#ACCOUNT_IDENTIFIER = :account_identifier",
            ScanIndexForward: false,
            ExpressionAttributeNames:{
                "#ACCOUNT_IDENTIFIER": "ACCOUNT_IDENTIFIER"
            },
            ExpressionAttributeValues: {
                ":account_identifier": {
                    S: `${this.accountName}#${args.join('#')}`
                }
            }
        }

        return this.ddb.query(ddbParams).promise();
    }


    async updateTracker (search_metadata, statuses_count, ...args) {
        let date = new Date();
        date.setDate(date.getDate() + 7);

        let item = {
            'ACCOUNT_IDENTIFIER': { S: `${this.accountName}#${args.join('#')}` },
            'CREATED_TIMESTAMP': { S: new Date(Date.now()).toISOString() },
            'COMPLETED_IN': { S: search_metadata.completed_in.toString() },
            'MAX_ID': { S: search_metadata.max_id_str },
            ...(search_metadata.next_results !== undefined && {'NEXT_RESULTS': { S: search_metadata.next_results }}),
            'QUERY': { S: search_metadata.query },
            ...(search_metadata.refresh_url !== undefined && {'REFRESH_URL': { S: search_metadata.refresh_url }}),
            'COUNT': { N: search_metadata.count.toString() },
            'SINCE_ID': { S: search_metadata.since_id_str},
            'STATUSES_COUNT': { S: statuses_count.toString() },
            'EXP_DATE': { N: Math.floor(date.getTime()/1000.0).toString() }
        };

        const ddbParams = {
            TableName: process.env.DDB_TABLE_NAME,
            Item: item
        };

        return this.ddb.putItem(ddbParams).promise();
    }
}

module.exports = FeedTracker;
