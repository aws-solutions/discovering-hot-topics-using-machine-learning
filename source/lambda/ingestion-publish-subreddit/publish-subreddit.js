/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb'),
    { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    this.checkEnvSetup();
    await this.publishSubReddits(await this.getSubRedditList());
};

exports.publishSubReddits = async (subreddits) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const eventBridge = new EventBridgeClient(awsCustomConfig);
    for (const subreddit of subreddits) {
        try {
            const response = await eventBridge.send(
                new PutEventsCommand({
                    Entries: [
                        {
                            EventBusName: process.env.EVENT_BUS_NAME,
                            DetailType: 'subreddit',
                            Source: process.env.SUBREDDIT_PUBLISH_NAMESPACE,
                            Detail: JSON.stringify({ name: subreddit, type: 'subreddit' })
                        }
                    ]
                })
            );
            console.debug(`Response from publishing event is ${JSON.stringify(response)}`);
            if (response.FailedEntryCount > 0) {
                console.error(`Following subreddit failed to publish: ${subreddit}`);
            }
        } catch (error) {
            console.error(`Error ocurred when publishing events to event bridge. Error is: ${JSON.stringify(error)}`);
            throw error;
        }
    }
};

exports.getSubRedditList = async () => {
    if (process.env.READ_SUBREDDITS_FROM_DDB == 'TRUE') {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        const ddb = new DynamoDBClient(awsCustomConfig);

        const ddbParams = {
            TableName: process.env.SOURCE_DDB_TABLE
        };

        try {
            const scanCmd = new ScanCommand(ddbParams);
            const ddbResponse = await ddb.send(scanCmd);
            console.debug(`DDB response ${JSON.stringify(ddbResponse)}`);
            return ddbResponse.Items.map((item) => item.SUB_REDDIT.S);
        } catch (ddbError) {
            console.error(
                `Error occured when trying to get subreddit list from DynamoDB table, error is: ${JSON.stringify(
                    ddbError
                )}`
            );
            throw ddbError;
        }
    } else if (process.env.SUBREDDITS_TO_FOLLOW && process.env.SUBREDDITS_TO_FOLLOW.length > 0) {
        const subreddits = process.env.SUBREDDITS_TO_FOLLOW.split(',');
        console.debug(`Publishing following subreddits, ${JSON.stringify(subreddits)}`);
        return subreddits;
    } else {
        throw Error('Neither environment variable nor Dynamodb setup for subreddits to follow');
    }
};

exports.checkEnvSetup = () => {
    // check for event bridge
    if (!(process.env.EVENT_BUS_NAME && process.env.SUBREDDIT_PUBLISH_NAMESPACE && process.env.SOURCE_DDB_TABLE)) {
        throw Error(
            'Some or all of environment variables not set. Please check if "EVENT_BUS_NAME", "SUBREDDIT_PUBLISH_NAMESPACE", and  "SOURCE_DDB_TABLE" variables are set with appropriate values'
        );
    }
};
