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
