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
    console.debug(`Event received is ${JSON.stringify(event)}`);

    const awsCustomConfig = CustomConfig.customAwsConfig();
    const comprehend = new AWS.Comprehend(awsCustomConfig);

    const response = {};
    let completedCount = 0;
    let failedCount = 0;
    const sourcePrefixList = process.env.SOURCE_PREFIX.toLowerCase().split(",");
    console.debug(`Source prefix list: ${JSON.stringify(sourcePrefixList)}`);
    for (const sourcePrefix of sourcePrefixList) {
        console.debug(`Processing source prefix: ${sourcePrefix}`);
        if (event[`${sourcePrefix}`]) {
            const serviceResponse = await comprehend.describeTopicsDetectionJob({
                JobId: event[`${sourcePrefix}`].JobId
            }).promise();

            if (serviceResponse?.TopicsDetectionJobProperties) {
                response[`${sourcePrefix}`] = serviceResponse.TopicsDetectionJobProperties;

                if (response[`${sourcePrefix}`].JobStatus === "COMPLETED") {
                    completedCount++;
                } else if (response[`${sourcePrefix}`].JobStatus === "FAILED") {
                    failedCount++;
                }
            }
        }
        else { // in case there is no job corresponding to the prefix, consider it to be completed.
            completedCount++;
        }
    }

    console.debug(`Completed count is: ${completedCount}, failed count is: ${failedCount}, and source type length is: ${sourcePrefixList.length}`)

    // update overall job status
    if (completedCount === sourcePrefixList.length) {
        response["JobStatus"] = "COMPLETED";
    } else if (failedCount === sourcePrefixList.length) {
        response["JobStatus"] = "FAILED";
    } else {
        response["JobStatus"] = "IN_PROGRESS";
    }

    console.debug(`Check status response is ${response}`);

    return response;
}
