/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      		  *
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

const { KinesisClient, PutRecordCommand } = require('@aws-sdk/client-kinesis');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const kinesisStream = new KinesisClient(awsCustomConfig);

    const result = kinesisStream.send(
        new PutRecordCommand({
            Data: Buffer.from(JSON.stringify(event)),
            PartitionKey: event.id,
            StreamName: process.env.STREAM_NAME
        })
    );

    console.debug(`Response from PutRecord: ${JSON.stringify(result)}`);
    return result;
};
