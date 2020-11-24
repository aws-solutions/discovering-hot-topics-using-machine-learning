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
    };
};

module.exports = IngestionWindow;