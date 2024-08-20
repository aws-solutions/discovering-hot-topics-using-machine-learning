/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const TextAnalysis = require('./util/store-text-analysis');
const ImageAnalysis = require('./util/store-text-img-analysis');
const ModerationLabels = require('./util/store-content-moderation');
const RawDataStorage = require('./util/raw-data-storage');

exports.handler = async (event) => {
    switch (event.source) {
        case process.env.TEXT_ANALYSIS_NS:
            await TextAnalysis.storeText(event.detail);
            await ImageAnalysis.storeTextFromImage(event.detail);
            await ModerationLabels.storeLabels(event.detail);
            break;
        case process.env.METADATA_NS:
            await RawDataStorage.storeFeed(event.detail);
            break;
        default:
            throw new Error('Event source not supported');
    }
};
