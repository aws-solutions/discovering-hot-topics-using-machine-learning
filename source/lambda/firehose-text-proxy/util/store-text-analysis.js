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

'use strict';

const TwFeedStorage = require('./tw-feed-storage');
const RawDataStorage = require('./raw-data-storage');
const FirehoseHelper = require('./firehose-helper');

class TextAnalysis {
    static storeText = async (data) => {
        // SONAR Rule: switch statements are useful when there are many different cases depending
        // on the value of the same expression. Plans to put in additional types in the future and
        // hence inserting a suppress rule
        switch (
            data.platform // NOSONAR (javascript:S1301), more platform types are to be added
        ) {
            case 'twitter':
                await TwFeedStorage.storeTweets(data);
                break;
            case 'newsfeeds':
            case 'youtubecomments':
            case 'reddit':
                await RawDataStorage.storeFeed(data);
                break;
            case 'customingestion':
                await RawDataStorage.trascribeFeed(data);
                // removing the elements since they have been processed in the 'transcribeFeed call
                delete data.feed.Items;
                delete data.feed.LoudnessScores;
                await RawDataStorage.storeFeed(data);
                break;
            default:
                console.error(`Received platform type as ${data.platform} which is not supported`);
                throw Error(`Received unsupported platform ${data.platform}`);
        }

        const sentimentRecord = {
            account_name: data.account_name,
            platform: data.platform,
            search_query: data.search_query,
            id_str: data.feed.id_str,
            created_at: data.feed.created_at,
            text: data.feed.text,
            translated_text: data.feed._translated_text,
            sentiment: data.Sentiment,
            sentimentposscore: data.SentimentScore.Positive,
            sentimentnegscore: data.SentimentScore.Negative,
            sentimentneuscore: data.SentimentScore.Neutral,
            sentimentmixscore: data.SentimentScore.Mixed
        };

        const sentimentData = JSON.stringify(sentimentRecord);
        await FirehoseHelper.putRecord(Buffer.from(`${sentimentData}\n`), process.env.SENTIMENT_FIREHOSE);

        const entitiesArray = data.Entities;
        const entitiesRecord = [];
        for (const entity of entitiesArray) {
            const entityData = JSON.stringify({
                account_name: data.account_name,
                platform: data.platform,
                search_query: data.search_query,
                id_str: data.feed.id_str,
                created_at: data.feed.created_at,
                text: data.feed.text,
                translated_text: data.feed._translated_text,
                entity_text: entity.Text,
                entity_type: entity.Type,
                entity_score: entity.Score,
                entity_begin_offset: entity.BeginOffset,
                entity_end_offset: entity.EndOffset
            });
            entitiesRecord.push({
                Data: Buffer.from(`${entityData}\n`)
            });
        }

        if (entitiesRecord.length > 0) {
            await FirehoseHelper.putRecordBatch(entitiesRecord, process.env.ENTITIES_FIREHOSE);
        }

        const keyPhrasesArray = data.KeyPhrases;
        const keyPhrasesRecord = [];
        for (const keyPhrase of keyPhrasesArray) {
            const keyphraseData = JSON.stringify({
                account_name: data.account_name,
                platform: data.platform,
                search_query: data.search_query,
                id_str: data.feed.id_str,
                created_at: data.feed.created_at,
                text: data.feed.text,
                translated_text: data.feed._translated_text,
                phrase: keyPhrase.Text,
                phrase_score: keyPhrase.Score,
                phrase_begin_offset: keyPhrase.BeginOffset,
                phrase_end_offset: keyPhrase.EndOffset
            });
            keyPhrasesRecord.push({
                Data: Buffer.from(`${keyphraseData}\n`)
            });
        }

        if (keyPhrasesRecord.length > 0) {
            await FirehoseHelper.putRecordBatch(keyPhrasesRecord, process.env.KEYPHRASE_FIREHOSE);
        }
    };
}

module.exports = TextAnalysis;
