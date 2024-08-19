/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

exports._news_feed_event = {
    detail: {
        'account_name': 'url_params',
        'platform': 'newsfeeds',
        'search_query': null,
        'feed': {
            'created_at': '2021-06-23 02:30:06',
            'entities': {
                'media': [],
                'urls': [
                    {
                        'expanded_url': 'https://fakeurl.com'
                    }
                ]
            },
            'extended_entities': {
                'media': [],
                'urls': [
                    {
                        'expanded_url': 'https://fakeurl.com'
                    }
                ]
            },
            'lang': 'en',
            'id_str': 'fakenumber#fakesite#0',
            'text': 'some fake news',
            'metadata': {
                'website': 'fakeurl',
                'country': 'None',
                'topic': 'faketopic'
            }
        }
    }
};
