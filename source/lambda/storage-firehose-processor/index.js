/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

exports.handler = (event, context, callback) => {
    const output = event.records.map((record) => {
        const payload = Buffer.from(record.data, 'base64').toString('utf8');
        const newPayload = JSON.parse(payload).detail;

        return {
            recordId: record.recordId,
            result: 'Ok',
            data: Buffer.from(JSON.stringify(newPayload)).toString('base64')
        };
    });
    console.debug(`Processing completed.  Successful records ${output.length}`);
    callback(null, { records: output });
};
