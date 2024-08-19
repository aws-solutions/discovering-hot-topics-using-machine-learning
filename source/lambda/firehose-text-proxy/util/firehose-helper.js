/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
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
