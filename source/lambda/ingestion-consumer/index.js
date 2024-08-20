/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { SFNClient: StepFunctions, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const stepfunctions = new StepFunctions(awsCustomConfig);

    await Promise.all(
        event.Records.map(async (record, index) => {
            const payload = Buffer.from(record.kinesis.data, 'base64').toString();
            const params = {
                stateMachineArn: process.env.STATE_MACHINE_ARN,
                input: payload
            };

            try {
                const command = new StartExecutionCommand(params);
                const response = await stepfunctions.send(command);
                console.log(`STATEMACHINE EXECUTE:: ${JSON.stringify(response, null, 2)}`);
            } catch (err) {
                console.error(`Error occured when processing ${payload}`, err);
                throw err;
            }
        })
    );
};
