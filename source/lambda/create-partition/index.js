/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

const parition = require('./util/partition');
const cfn = require('./util/cfn');

exports.handler = async(event, context) => {
    console.debug(`Event received is ${JSON.stringify(event)}`);
    try {
        let result;
        if (event.RequestType === undefined || event.RequestType !== 'Delete') {
            result = await parition.create();
        }

        if (event.RequestType === 'Create' || event.RequestType === 'Update' || event.RequestType == 'Delete') {
            return await cfn.send(event, context, 'SUCCESS');
        }
    } catch(error) {
        console.error(`Error occured when calling create partition${error}`);
        if (event.RequestType === 'Create' || event.RequestType === 'Update' || event.RequestType == 'Delete') {
            await cfn.send(event, context, 'FAILED', error.message + `\nMore information in CloudWatch Log Stream: ${context.logStreamName}`);
        }
    }
}
