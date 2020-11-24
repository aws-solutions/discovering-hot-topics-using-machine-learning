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

const TwitterClient = require('./util/twitter-client');
const FeedProducer = require('./util/feed-producer');

exports.handler = async (event) => {
    try {
        // twitter client initialization
        //TODO - use the account name from the event object
        //const twitterClient = new TwitterClient(event.body.accountName);
        const twitterClient = new TwitterClient('twitter');

        const languages = process.env.SUPPORTED_LANG.split(',');
        for (const language of languages) {

            //TODO change the tweet search query to use event object
            //const twitterClient = await twitterClient.searchTweets(event.body.query);
            const response = await twitterClient.searchTweets(process.env.QUERY_PARAM, language);

            // if the response.length is 0 which means no tweets were returned by the search API
            if (response.length > 0) {
                //TODO - use name from event object
                //const feedProducer = new FeedProcuder(event.body.accountName);
                await (new FeedProducer('twitter')).writeToStream(response, {
                    accountName: 'twitter', //TODO replace with event.body.accountName
                    platform: 'twitter',
                    query: process.env.QUERY_PARAM
                });
            }
        }
    } catch (error) {
        console.error(`Error occured while processing producer lambda function ${error}`);
        throw error;
    }
};
