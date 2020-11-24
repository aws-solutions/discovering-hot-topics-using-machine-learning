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

const TextAnalysis = require('./util/store-text-analysis');
const ImageAnalysis = require('./util/store-text-img-analysis');
const ModerationLabels = require('./util/store-content-moderation');

exports.handler = async (event) => {
    if (event.source === process.env.TEXT_ANALYSIS_NS) {
        TextAnalysis.storeText(event.detail);
        ImageAnalysis.storeText(event.detail);
        ModerationLabels.storeLabels(event.detail);
    } else {
        throw new Error('Event source not supported');
    }
}