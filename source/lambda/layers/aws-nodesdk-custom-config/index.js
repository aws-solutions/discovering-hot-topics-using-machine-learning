/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

"use strict";

exports.customAwsConfig = function() {
    return {
        ...JSON.parse(process.env.AWS_SDK_USER_AGENT),
        region: process.env.AWS_REGION,
        maxRetries: 10,
    };
}