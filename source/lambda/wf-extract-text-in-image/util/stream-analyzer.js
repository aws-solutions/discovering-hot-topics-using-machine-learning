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

const { stringify } = require("querystring");

class StreamAnalyzer {


    /**
     *  To check if the media entity object exists. If it does the extended media objects has all the URLs
     *
     * @param {*} feed
     */
    static getMediaEntity (feed) {
        let media;
        if (feed.entities.media !== undefined) {
            if (feed.extended_entities !== undefined) { // check if extended entities exists. If yes then use extended entities to ingest media
                if (feed.extended_entities.media !== undefined) {
                    media = feed.extended_entities.media
                } else {
                    media = feed.entities.media
                }
            } else {
                media = feed.entities.media
            }
        }

        return media;
    }

    static getMediaUrl (media) {
        let mediaUrl;
        if (media.media_url_https !== undefined || media.media_url !== undefined) {
            // check if https is available use https if not use http
            if (media.media_url_https !== undefined) {
                mediaUrl = media.media_url_https;
            } else {
                mediaUrl = media.media_url;
            }
        }

        return mediaUrl;
    }
}

module.exports = StreamAnalyzer;
