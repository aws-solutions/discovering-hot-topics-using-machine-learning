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

const Twit = require('twitter-lite');
const AccountSecrets = require('./account-secrets');
const FeedTracker = require('./feed-tracker');

class TwitterClient {
    constructor (accountName) {
        this.accountName = accountName;
        this.feedTracker = new FeedTracker(accountName);
    }

    async init() {
        //retrieve secrets
        const accountSecrets = new AccountSecrets();
        const secretString = await accountSecrets.getSecretValue(this.accountName);

        // initialize the twitter client
        const twitterClient = new Twit({
            subdomain: 'api',
            version: '1.1',
            bearer_token: secretString
        });

        return twitterClient;
    }

    async searchTweets (searchQuery, language) {
        const twit = await this.init();
        // console.debug(`The ID for query ${JSON.stringify(trackerID)}`);

        const trackerID = await this.feedTracker.getIDFromTracker(language);
        const twitParams = {
            q: searchQuery,
            count: parseInt(process.env.CAP_NUM_RECORD),
            since_id: trackerID,
            include_entities: true,
            result_type: 'mixed',
            lang: language
        };

        console.debug(`Tweet search parameters is ${JSON.stringify(twitParams)}`);

        let response = null;
        try {
            response = await twit.get("search/tweets", twitParams);
        } catch (error) {
            if ('errors' in error) {
                // Twitter API errors
                if (e.errors[0].code === 88) {
                    console.warn(`Rate limit will reset on: ${new Date(e._headers.get("x-rate-limit-reset") * 1000)}`);
                    console.warn(`The headers from the API call are: ${JSON.stringify(e._headers)}`);
                } else {
                    console.error('Twitter API throw error: ', e);
                }
            } else {
                console.error('Generic error when calling Twitter API: ', e);
                throw error;
            }
        }

        const jsonData = response.statuses;
        console.debug(`Received ${jsonData.length} with the following query: ${response.search_metadata.query}`);

        // if max_id_str is undefined that means there are no further tweets available and hence tracker is not updated
        // max_id_str is a pagination counter for the search query
        if (response.search_metadata.max_id_str !== undefined) {
            const max_id_str = response.search_metadata.max_id_str;
            await this.feedTracker.updateTracker(response.search_metadata, jsonData.length, language);
        }

        return jsonData;
    }
}

module.exports = TwitterClient;
