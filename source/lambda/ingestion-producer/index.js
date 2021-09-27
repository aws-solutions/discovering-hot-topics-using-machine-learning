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

const TwitterClient = require('./util/twitter-client');
const FeedProducer = require('./util/feed-producer');
const FeedTracker = require('./util/feed-tracker');

exports.handler = async (event) => {
    if (event.source === "aws.events"){
        await processCloudWatchEvent(event);
    } else if (event.Records?.length > 0) {
        await processActivityEvents(event);
    } else if (event.source === 'dht' && event.action === 'resetdb') {
        await (new FeedTracker('twitter')).deleteAllItems();
    } else {
        console.error(`Received event but did not match any processor, Event: ${JSON.stringify(event)}`);
    }
};

const processCloudWatchEvent = async (event) => {
    try {
        // twitter client initialization
        const twitterClient = new TwitterClient('twitter');

        // check if twitter limits not reached
        let limitRemaining = parseInt(await twitterClient.hasLimit('search'));
        console.debug(`Limit remaining: ${limitRemaining}`);
        if (limitRemaining > 0) {

            const languages = process.env.SUPPORTED_LANG.split(',');
            for (let index = 0; index < languages.length && limitRemaining > 0; ++index){
                const tweetSearchParams = {
                    q: process.env.QUERY_PARAM,
                    count: parseInt(process.env.CAP_NUM_RECORD),
                    ...(process.env.LOCATION_GEOCODE !== undefined ? {geocode: process.env.LOCATION_GEOCODE}: undefined),
                    include_entities: true,
                    result_type: process.env.QUERY_RESULT_TYPE,
                    tweet_mode: process.env.TWEET_MODE,
                    lang: languages[index]
                };
                console.debug(`Search API Params: ${JSON.stringify(tweetSearchParams)}`);
                const response = await twitterClient.searchTweets(tweetSearchParams, tweetSearchParams.lang);

                // if the response.length is 0 which means no tweets were returned by the search API
                if (response.length > 0) {
                    await (new FeedProducer()).writeToStream(response, {
                        accountName: 'twitter',
                        platform: 'twitter',
                        query: process.env.QUERY_PARAM
                    });
                }

                --limitRemaining; // decrease the remaining limit after the API call was being made
                if (index < languages.length && limitRemaining === 0) {
                    console.warn('Throttling limit reached. Hence no more calls to Twitter will be made, until the limit is reset. Limit automatically resets in the next window');
                }
            }
        } else {
            console.warn('Throttling limit reached. Hence no more calls to Twitter will be made, until the limit is reset. Limit automatically resets in the next window');
        }
    } catch (error) {
        console.error(`Error occured while processing producer lambda function ${JSON.stringify(error)}`);
        throw error;
    }
};
