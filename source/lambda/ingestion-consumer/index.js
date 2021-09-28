/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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
    const stepfunctions = new AWS.StepFunctions(awsCustomConfig);

	await Promise.all(event.Records.map(async (record, index) => {
		const payload = Buffer.from(record.kinesis.data, 'base64').toString();
		const params = {
			stateMachineArn: process.env.STATE_MACHINE_ARN,
			input: payload
		};

		try {
			let response = await stepfunctions.startExecution(params).promise();
			console.log(`STATEMACHINE EXECUTE:: ${JSON.stringify(response, null, 2)}`);
		} catch (err) {
			console.error(`Error occured when processing ${payload}`, err);
			throw err;
		}
	}));
};