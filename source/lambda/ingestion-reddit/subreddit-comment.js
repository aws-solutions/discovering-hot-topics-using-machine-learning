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

const snoowrap = require('snoowrap');
const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');
const { getCommentsTracker, updateCommentsTracker } = require('./comments-tracker');
const StreamComment = require('./stream-comment');

const TERMINATION_INTERVAL = 5000; //milliseconds before lambda time out to store state information
const SLEEP_DURATION = 1000; //milliseconds

exports.handler = async (event, context) => {
    this.checkEnvSetup();

    const subreddit = event['detail'].name;
    console.debug(`Subreddit retrieved: ${subreddit}`);

    await this.getComments(subreddit, context);
};

exports.getRedditAPI = async () => {
    return new snoowrap(await this.getRedditAPICredentials());
};

exports.getComments = async (subreddit, context) => {
    // NOSONAR (javascript:S3776), do not intend to simplify it further
    const r = await this.getRedditAPI();
    let before = await getCommentsTracker(subreddit);
    let terminate = false;

    let loopIndex = 0;
    const query = subreddit.substring('r/'.length);

    while (!terminate) {
        ++loopIndex;
        const comments = await r.getNewComments(query, { ...(before ? { before: before, limit: 25 } : undefined) });
        if (comments.length > 0) {
            for (const comment of comments) {
                before = comment.name;

                if (context.getRemainingTimeInMillis() < TERMINATION_INTERVAL) {
                    await StreamComment.publishComment(comment, true);
                    await updateCommentsTracker(subreddit, before);
                    terminate = true;
                    break;
                } else {
                    await StreamComment.publishComment(comment, false);
                    await this.sleep(SLEEP_DURATION);
                    terminate = await this.traverseCommentTree(subreddit, comment, context, before);
                }
            }
        } else {
            console.debug(`No comments found for ${subreddit} and hence terminating`);
            break;
        }

        if (!terminate) await this.sleep(SLEEP_DURATION);
    }

    console.debug(`This function looped ${loopIndex} to retrieve new comments for ${subreddit}`);
};

/**
 * Implementing custom sleep instead of using snoowrap's config since snoowrap queues the request.
 * This might result in lot of requests being queued and lambda timing out. Instead let the process
 * sleep and wait to avoid Reddit throttling requests
 */
exports.sleep = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

exports.traverseCommentTree = async (subreddit, comment, context, before) => {
    let terminate = false;
    while (!terminate) {
        let replies;
        try {
            replies = await comment.replies.fetchMore({ amount: 100, append: false });
            if (replies.length > 0) {
                for (const reply of replies) {
                    if (context.getRemainingTimeInMillis() < TERMINATION_INTERVAL) {
                        await StreamComment.publishComment(reply, true);
                        if (!terminate) {
                            await updateCommentsTracker(subreddit, before);
                        }
                        terminate = true;
                        break;
                    } else {
                        await StreamComment.publishComment(reply, false);
                        await this.sleep(SLEEP_DURATION);
                        terminate = await this.traverseCommentTree(subreddit, reply, context, before);
                    }
                }
            } else {
                console.debug(`No replies found for ${subreddit} and hence terminating`);
                break;
            }

            if (!terminate) await this.sleep(SLEEP_DURATION);
        } catch (error) {
            console.error(`Error occured when traversing the comment tree, ${JSON.stringify(error)}`);
            throw error;
        } finally {
            await updateCommentsTracker(subreddit, before);
        }
    }

    return terminate;
};

exports.getRedditAPICredentials = async () => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const ssm = new AWS.SSM(awsCustomConfig);

    try {
        const secretResponse = await ssm
            .getParameter({
                Name: process.env.REDDIT_API_KEY,
                WithDecryption: true
            })
            .promise();

        const redditCreds = JSON.parse(secretResponse.Parameter.Value);
        if (
            !(
                redditCreds.hasOwnProperty('clientId') &&
                redditCreds.hasOwnProperty('clientSecret') &&
                redditCreds.hasOwnProperty('refreshToken')
            )
        ) {
            console.error(
                'Either "clientId" or "clientSecret" or "refreshToken" is missing in the JSON string retrieved from Parameter Store'
            );
            throw new Error(
                'Either "clientId" or "clientSecret" or "refreshToken" is missing in the JSON string retrieved from Parameter Store'
            );
        }
        redditCreds[
            'userAgent'
        ] = `${process.env.STACK_NAME}:${process.env.SOLUTION_ID}:${process.env.SOLUTION_VERSION} (by /u/user)`;

        return redditCreds;
    } catch (error) {
        console.error(`Error getting credentials for Reddit from SSM, error is: ${JSON.stringify(error)}`);
        throw error;
    }
};

exports.checkEnvSetup = () => {
    if (
        !(
            process.env.TARGET_DDB_TABLE &&
            process.env.REDDIT_API_KEY &&
            process.env.SOLUTION_VERSION &&
            process.env.STACK_NAME &&
            process.env.SOLUTION_ID &&
            process.env.STREAM_NAME
        )
    ) {
        throw new Error(
            'Some or all of environment variables not set. Please check if "TARGET_DDB_TABLE", "REDDIT_API_KEY", "STREAM_NAME", "SOLUTION_VERSION", "STACK_NAME" and "SOLUTION_ID" variables are set with appropriate values'
        );
    }
};
