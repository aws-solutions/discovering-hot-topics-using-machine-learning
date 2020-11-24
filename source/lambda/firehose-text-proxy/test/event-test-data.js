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
    source: 'com.analyze.text.inference',
    detail: {
        "account_name": "twitter",
        "platform": "twitter",
        "search_query": "Abc",
        "feed": {
            "created_at": "Sat Jun 13 17:07:39 +0000 2020",
            "id": 123456789012345678,
            "id_str": "123456789012345678",
            "text": "This is sample tweet from twitter. This is used for test data",
            "truncated": false,
            "entities": {
                "hashtags": [],
                "symbols": [],
                "user_mentions": [],
                "urls": []
            },
            "metadata": {
                "iso_language_code": "de",
                "result_type": "recent"
            },
            "geo": null,
            "coordinates": null,
            "place": null,
            "contributors": null,
            "is_quote_status": false,
            "retweet_count": 0,
            "favorite_count": 0,
            "favorited": false,
            "retweeted": false,
            "possibly_sensitive": false,
            "lang": "de",
            "_translated_text": "This is sample text from tweet.",
            "_cleansed_text": "This is sample text from tweet"
        },
        "Sentiment": "NEUTRAL",
        "SentimentScore": {
            "Positive": 0.007853682152926922,
            "Negative": 0.0011625795159488916,
            "Neutral": 0.990983247756958,
            "Mixed": 5.080233904664055e-7
        },
        "Entities": [
            {
                "Score": 0.5212405920028687,
                "Type": "ORGANIZATION",
                "Text": "organization",
                "BeginOffset": 6,
                "EndOffset": 15
            },
            {
                "Score": 0.945159912109375,
                "Type": "LOCATION",
                "Text": "location",
                "BeginOffset": 21,
                "EndOffset": 29
            }
        ],
        "KeyPhrases": [
            {
                "Score": 0.9999958276748657,
                "Text": "organization",
                "BeginOffset": 6,
                "EndOffset": 15
            }
        ]
    }
};

exports.event_with_img = {
    source: 'com.analyze.text.inference',
    detail: {
        "account_name": "twitter",
        "platform": "twitter",
        "search_query": "some%20search%query",
        "feed": {
            "created_at": "Sat Jun 13 17:07:39 +0000 2020",
            "id": 123456789012345678,
            "id_str": "123456789012345678",
            "text": "This is sample tweet from twitter. This is used for test data",
        },
        "text_in_images": [{
            "text": "This is some fake text extracted from a jpeg file",
            "Sentiment": "NEUTRAL",
            "SentimentScore": {
                "Positive": 0.007853682152926922,
                "Negative": 0.0011625795159488916,
                "Neutral": 0.990983247756958,
                "Mixed": 5.080233904664055e-7
            },
            "Entities": [
                {
                    "Score": 0.5212405920028687,
                    "Type": "ORGANIZATION",
                    "Text": "organizaiton",
                    "BeginOffset": 6,
                    "EndOffset": 15
                },
                {
                    "Score": 0.945159912109375,
                    "Type": "LOCATION",
                    "Text": "location",
                    "BeginOffset": 21,
                    "EndOffset": 29
                }
            ],
            "KeyPhrases": [
                {
                    "Score": 0.9999958276748657,
                    "Text": "organization",
                    "BeginOffset": 6,
                    "EndOffset": 15
                }
            ]
        }]
    }
}

exports.event_with_moderation_labels = {
    source: 'com.analyze.text.inference',
    detail: {
        "account_name": "twitter",
        "platform": "twitter",
        "search_query": "some%20search%query",
        "feed": {
            "created_at": "Sat Jun 13 17:07:39 +0000 2020",
            "id": 123456789012345678,
            "id_str": "123456789012345678",
            "text": "This is sample tweet from twitter. This is used for test data",
        },
        "moderation_labels_in_imgs": [{
            "image_url": "https://someimageurl/media/someimage.jpg",
            "labels": [{
                "Name": "somebadlabel",
                "Confidence": 0.75
            }]
        }]
    }
};