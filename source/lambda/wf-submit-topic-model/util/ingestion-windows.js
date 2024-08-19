/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

"use strict";

class IngestionWindow {
    static calculateIngestionWindow (currentUtcTimestamp, ingestionWindow) {
        const bucketPrefixArray = [];

        for (let index = 0; index < ingestionWindow; ++index) {
            currentUtcTimestamp.setUTCHours(currentUtcTimestamp.getUTCHours() - 1);
            const keyPrefix = currentUtcTimestamp.getUTCFullYear()                      + '/'
                            + ('0' + (currentUtcTimestamp.getUTCMonth()+1)).slice(-2)   + '/'
                            + ('0' + currentUtcTimestamp.getUTCDate()).slice(-2)        + '/'
                            + ('0' + currentUtcTimestamp.getUTCHours()).slice(-2)       + '/';
            bucketPrefixArray.push(keyPrefix);
        }

        return bucketPrefixArray;
    }
}

module.exports = IngestionWindow;
