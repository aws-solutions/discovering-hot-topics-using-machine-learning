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