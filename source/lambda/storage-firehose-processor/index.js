/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

exports.handler = (event, context, callback) => {
    const output = event.records.map((record) => {
        const payload = Buffer.from(record.data, 'base64').toString('utf8');
        const newPayload = JSON.parse(payload).detail;

        return {
            recordId: record.recordId,
            result: 'Ok',
            data: Buffer.from(JSON.stringify(newPayload)).toString('base64'),
        };
    });
    console.debug(`Processing completed.  Successful records ${output.length}`);
    callback(null, { records: output });
};