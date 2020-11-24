/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                      *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

exports.event = {
        account_name: 'twitter',
        platform: 'twitter',
        search_query: 'Abc',
        feed: {
            "created_at": "Mon May 06 20:01:29 +0000 2019",
            "id": 12345678901234567890,
            "id_str": "12345678901234567890",
            "text": "This is a sample tweet",
            "_translated_text": "This is a simple tweet",
            "_cleansed_text": "This is a simple tweet",
            "truncated": true,
            "entities": {
                "hashtags": [],
                "symbols": [],
                "user_mentions": [],
                "urls": []
            },
            "metadata": {
                "iso_language_code": "en",
                "result_type": "recent"
            },
            "in_reply_to_status_id": null,
            "in_reply_to_status_id_str": null,
            "in_reply_to_user_id": null,
            "in_reply_to_user_id_str": null,
            "in_reply_to_screen_name": null,
            "geo": null,
            "coordinates": null,
            "place": null,
            "contributors": null,
            "is_quote_status": true,
            "quoted_status_id": 1234567890123456789,
            "quoted_status_id_str": "1234567890123456789",
            "retweet_count": 20,
            "favorite_count": 44,
            "favorited": false,
            "retweeted": false,
            "possibly_sensitive": false,
            "lang": "en"
        }
    };

exports.eventWithRekText = Object.assign(this.event, {
    text_in_images: [{
        "image_url": "https://somefakeurl/media/somefile1.jpg",
        "text": "It's Monday. Have a nice day",
        "_cleansed_text": "It's Monday. Have a nice day"
    }, {
        "image_url": "https://somefakeurl/media/somefile2.jpg",
        "text": "This is awesomne. Have some fun",
        "_cleansed_text":"This is awesomne. Have some fun"
    }]
});