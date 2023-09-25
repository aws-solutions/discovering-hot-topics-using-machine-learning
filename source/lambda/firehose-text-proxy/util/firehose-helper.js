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

const { FirehoseClient, PutRecordCommand, PutRecordBatchCommand } = require('@aws-sdk/client-firehose');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.putRecordBatch = async (array, streamName) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const kinesisFireshose = new FirehoseClient(awsCustomConfig);
    const response = await kinesisFireshose.send(
        new PutRecordBatchCommand({
            DeliveryStreamName: streamName,
            Records: array
        })
    );
    return response;
};

exports.putRecord = async (record, streamName) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const kinesisFireshose = new FirehoseClient(awsCustomConfig);

    return await kinesisFireshose.send(
        new PutRecordCommand({
            DeliveryStreamName: streamName,
            Record: {
                Data: Buffer.from(record)
            }
        })
    );
};
