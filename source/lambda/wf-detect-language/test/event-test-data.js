/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

 "use strict";

exports._event = {
    Records: [{
        body: JSON.stringify({
            input: {
                "feed": {
                    "video_id": "fakevideoid",
                    "text": "This is a fake comment",
                    "id_str": "fakecommentid",
                    "parent_id": null,
                    "viewer_rating": "none",
                    "like_count": 0,
                    "created_at": "2021-05-07T15:51:01Z",
                    "updated_at": "2021-05-07T15:51:01Z"
                },
                "platform": "youtube",
                "account_name": "comments",
                "search_query": "fakequery#fakechannel"
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports._less_char_event = {
    Records: [{
        body: JSON.stringify({
            input: {
                "feed": {
                    "video_id": "fakevideoid",
                    "text": "Ab",
                    "id_str": "fakecommentid",
                    "parent_id": null,
                    "viewer_rating": "none",
                    "like_count": 0,
                    "created_at": "2021-05-07T15:51:01Z",
                    "updated_at": "2021-05-07T15:51:01Z"
                },
                "platform": "youtube",
                "account_name": "comments",
                "search_query": "fakequery#fakechannel"
            },
            taskToken: 'fakeToken'
        })
    }]
};

exports._with_valid_lang = {
    Records: [{
        body: JSON.stringify({
            input: {
                "feed": {
                    "lang": "en",
                    "video_id": "fakevideoid",
                    "text": "Ab",
                    "id_str": "fakecommentid",
                    "parent_id": null,
                    "viewer_rating": "none",
                    "like_count": 0,
                    "created_at": "2021-05-07T15:51:01Z",
                    "updated_at": "2021-05-07T15:51:01Z"
                },
                "platform": "youtube",
                "account_name": "comments",
                "search_query": "fakequery#fakechannel"
            },
            taskToken: 'fakeToken'
        })
    }]
};