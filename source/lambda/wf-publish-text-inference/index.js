/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const eventBridge = new EventBridgeClient(awsCustomConfig);

    try {
        const response = await eventBridge.send(
            new PutEventsCommand({
                Entries: [
                    {
                        EventBusName: process.env.EVENT_BUS_NAME,
                        DetailType: `${event.platform}.${event.account_name}`,
                        Detail: JSON.stringify(event),
                        Source: process.env.EVENT_NAMESPACE
                    }
                ]
            })
        );

        if (response.FailedEntryCount > 0) {
            console.error(`Following event failed to publish ${event}`);
            throw new Error('EventBridge failed to publish an event. Received FailedEntryCount > 0');
        }

        return response;
    } catch (error) {
        console.error('Error in publishing event', error);
        throw error;
    }
};
