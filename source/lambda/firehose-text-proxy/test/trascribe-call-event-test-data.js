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

exports.event_transcribed_data = {
    detail: {
        'feed': {
            'id_str': 'fakeid#1',
            'parent_id': 'fakeid',
            'created_at': '2022-01-31T15:51:33.684Z',
            'text': 'Some fake text for testing',
            'lang': 'en',
            'LoudnessScores': [85.88, 86.36, 84.78, 85.13, 85.71],
            'Content': 'Some fake text for testing',
            'Items': [
                {
                    'Type': 'pronunciation',
                    'Confidence': 1,
                    'Content': 'Some',
                    'BeginOffsetMillis': 164440,
                    'EndOffsetMillis': 164690
                },
                {
                    'Type': 'pronunciation',
                    'Confidence': 0.9779,
                    'Content': 'fake',
                    'BeginOffsetMillis': 164690,
                    'EndOffsetMillis': 164890
                },
                {
                    'Type': 'pronunciation',
                    'Confidence': 0.9676,
                    'Content': 'text',
                    'BeginOffsetMillis': 164890,
                    'EndOffsetMillis': 165200
                },
                {
                    'Type': 'pronunciation',
                    'Confidence': 1,
                    'Content': 'for',
                    'BeginOffsetMillis': 165200,
                    'EndOffsetMillis': 165610
                },
                {
                    'Type': 'pronunciation',
                    'Confidence': 0.999,
                    'Content': 'testing',
                    'BeginOffsetMillis': 165610,
                    'EndOffsetMillis': 166000
                },

                {
                    'Type': 'punctuation',
                    'Confidence': 0,
                    'Content': '.'
                }
            ],
            'Id': 'fakeIdentifier',
            'BeginOffsetMillis': 164440,
            'EndOffsetMillis': 171550,
            'Sentiment': 'NEUTRAL',
            'ParticipantRole': 'AGENT',
            'source_file': 'transcribe_call_analytics.json',
            '_translated_text': 'Some fake text for testing',
            '_cleansed_text': 'Some fake text for testing'
        },
        'text_in_images': [],
        'moderation_labels_in_imgs': [],
        'account_name': 'call_analytics',
        'SentimentScore': {},
        'KeyPhrases': [
            {
                'Score': 0.9999370574951172,
                'Text': 'fake',
                'BeginOffset': 21,
                'EndOffset': 34
            },
            {
                'Score': 0.9999468922615051,
                'Text': 'text',
                'BeginOffset': 40,
                'EndOffset': 53
            }
        ],
        'search_query': '',
        'platform': 'customingestion',
        'Sentiment': 'NEUTRAL',
        'Entities': [
            {
                'Score': 0.9234032034873962,
                'Type': 'QUANTITY',
                'Text': 'fake number',
                'BeginOffset': 21,
                'EndOffset': 34
            }
        ]
    }
};
