/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

class StreamAnalyzer {
    /**
     * The media entity object in the tweet feed contains media url. the media entity does not have all the URLs and hence
     * the use of the extended media entity object to get all the associated images
     *
     * @param {*} feed
     */
    static getMediaEntity(feed) {
        let media;
        if (feed.entities.media !== undefined) {
            if (feed.extended_entities !== undefined) {
                // check if extended entities exists. If yes then use extended entities to ingest media
                if (feed.extended_entities.media !== undefined) {
                    media = feed.extended_entities.media;
                } else {
                    media = feed.entities.media;
                }
            } else {
                media = feed.entities.media;
            }
        }

        return media;
    }

    /**
     * To get the URLs of the media objects associated with the tweets.
     *
     * @param {*} media
     */
    static getMediaUrl(media) {
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
