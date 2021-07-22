/**********************************************************************************************************************
*  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
*                                                                                                                    *
*  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
*  with the License. A copy of the License is located at                                                             *
*                                                                                                                    *
*      http://www.apache.orglicenses/LICENSE-2.0                                                                     *
*                                                                                                                    *
*  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
*  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
*  and limitations under the License.                                                                                *
*********************************************************************************************************************/

"use strict"

exports.event_fr = {
    Records: [{
        body: JSON.stringify({
            input: {
                account_name: 'twitter',
                platform: 'twitter',
                search_query: 'Abc',
                feed: {
                    "created_at": "Mon May 06 20:01:29 +0000 2019",
                    "id_str": "fakeid",
                    "text": "Succès",
                    "truncated": true,
                    "metadata": {
                        "iso_language_code": "fr",
                        "result_type": "recent"
                    },
                    "lang": "fr"
                }
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports.event = {
    Records: [{
        body: JSON.stringify({
            input: {
                account_name: 'twitter',
                platform: 'twitter',
                search_query: 'Abc',
                feed: {
                    "created_at": "Mon May 06 20:01:29 +0000 2019",
                    "id_str": "fakeid",
                    "text": "This is a sample tweet",
                    "truncated": true,
                    "metadata": {
                        "iso_language_code": "en",
                        "result_type": "recent"
                    },
                    "lang": "en"
                }
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports.event_zh_cn = {
    Records: [{
        body: JSON.stringify({
            input: {
                account_name: 'twitter',
                platform: 'twitter',
                search_query: 'Abc',
                feed: {
                    "created_at": "Mon May 06 20:01:29 +0000 2019",
                    "id_str": "fakeid",
                    "text": "Succès",
                    "truncated": true,
                    "metadata": {
                        "iso_language_code": "zh-cn",
                        "result_type": "recent"
                    },
                    "lang": "zh-cn"
                }
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports.event_zh_tw = {
    Records: [{
        body: JSON.stringify({
            input: {
                account_name: 'twitter',
                platform: 'twitter',
                search_query: 'Abc',
                feed: {
                    "created_at": "Mon May 06 20:01:29 +0000 2019",
                    "id_str": "fakeid",
                    "text": "Succès",
                    "truncated": true,
                    "metadata": {
                        "iso_language_code": "en",
                        "result_type": "recent"
                    },
                    "lang": "zh-tw"
                }
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports.event_with_embedded_text = {
    Records: [{
        body: JSON.stringify({
            input: {
                account_name: 'twitter',
                platform: 'twitter',
                search_query: 'Abc',
                feed: {
                    "created_at": "Mon May 06 20:01:29 +0000 2019",
                    "id_str": "fakeid",
                    "text": "This is a sample tweet",
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
                    "lang": "en"
                },
                "text_in_images": [
                    {
                        "image_url": "https://someurl/media/somefile.jpeg",
                        "text": "It's monday, keep similing"
                    }
                ]
            },
            taskToken: 'fakeToken'
        })
    }]
};
