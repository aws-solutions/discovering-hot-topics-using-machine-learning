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
 const CustomConfig = require('aws-nodesdk-custom-config');

 exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const eventBridge = new AWS.EventBridge(awsCustomConfig);

     try {
         const response = await eventBridge.putEvents({
             Entries: [{
                 EventBusName: process.env.EVENT_BUS_NAME,
                 DetailType: `${event.platform}.${event.account_name}`,
                 Detail: JSON.stringify(event),
                 Source: process.env.EVENT_NAMESPACE
             }]
         }).promise();

         if (response.FailedEntryCount > 0) {
             console.error(`Following event failed to publish ${event}`);
             throw new Error('EventBridge failed to publish an event. Received FailedEntryCount > 0');
         }

         return response;
     } catch (error) {
         console.error('Error in publishing event', error);
         throw error;
     }
 }
