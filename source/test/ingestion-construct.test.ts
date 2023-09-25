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

import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';
import { Ingestion } from '../lib/ingestion/ingestion-construct';

test('Event Bus creation', () => {
    const stack = new cdk.Stack();

    const _cronRegex = DiscoveringHotTopicsStack.cronRegex;

    const _deployTwitter = new cdk.CfnParameter(stack, 'DeployTwitter', {
        type: 'String',
        default: 'Yes',
        allowedValues: ['Yes', 'No'],
        description: 'Would you like to deploy Twitter Ingestion mechanism'
    });

    const _twitterIngestFreqParam = new cdk.CfnParameter(stack, 'TwitterIngestQueryFrequency', {
        type: 'String',
        default: 'cron(0/5 * * * ? *)',
        description:
            'The frequency at which API calls will be made to twitter in a cron expression format. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
        allowedPattern: _cronRegex,
        constraintDescription:
            "Please provide a valid cron expression of the format 'cron(0/5 * * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
    });

    const _queryParam = new cdk.CfnParameter(stack, 'TwitterSearchQuery', {
        type: 'String',
        description:
            'The query you would like to execute on twitter. For details of how write a query and use operators, please go to https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators',
        minLength: 3,
        maxLength: 500,
        default: 'entertainment'
    });

    const _supportedLang = new cdk.CfnParameter(stack, 'SupportedLanguages', {
        default: 'en,es',
        description:
            'The list of languages to query the Search API with. The super set of languages supported is driven by Amazon Translate. For the latest list of languages, please refer to the Comprehend documentation at this location https://docs.aws.amazon.com/translate/latest/dg/what-is.html#language-pairs',
        maxLength: 43,
        minLength: 2,
        allowedPattern: '^$|([a-z]{2}-[a-z]{2}|[a-z]{2})(,([a-z]{2}-[a-z]{2}|[a-z]{2}))*',
        constraintDescription:
            'Provide a list of comma separated language iso-code values, Example: de,en,es,it,pt,fr,ja,ko,zh-cn (no spaces after the comma). The input did not match the validation pattern.'
    });

    const _topicSchedule = new cdk.CfnParameter(stack, 'TopicAnalysisFrequency', {
        type: 'String',
        default: 'cron(10 0 * * ? *)',
        allowedPattern: _cronRegex,
        description:
            'The frequency at which the topic analysis job should run. The minimum is an hour. It is recommened That the job be run a few mins after the hour e.g 10 mins after the hour',
        constraintDescription:
            "Please provide a valid cron expression of the format 'cron(10 0 * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
    });

    const _numberOfTopics = new cdk.CfnParameter(stack, 'NumberOfTopics', {
        type: 'Number',
        default: '10',
        minValue: 1,
        maxValue: 100,
        description:
            'The number of topics to be discovered by Topic analysis. The min value is 1 and maximum value is 100',
        constraintDescription:
            'Please verify if the value entered for number of topics to be discovered is between 1 and 100 (both inclusive).'
    });

    const _credentialKeyPath = new cdk.CfnParameter(stack, 'TwitterSSMPathForBearerToken', {
        type: 'String',
        default: '/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter',
        allowedPattern: '^(?!\\s*$).+',
        description: 'The SSM parameter store path of key where the credentials are stored as encrypted string',
        constraintDescription: 'The SSM parameter store path cannot be empty'
    });

    const _deployRSSFeeds = new cdk.CfnParameter(stack, 'DeployRSSFeeds', {
        type: 'String',
        default: 'Yes',
        allowedValues: ['Yes', 'No'],
        description: 'Would you like to deploy Twitter Ingestion mechanism'
    });

    const _newsSearchQuery = new cdk.CfnParameter(stack, 'NewsSearchQuery', {
        type: 'String',
        description:
            'Provide comma separated list of keywords (optional) to filter news feeds. Only feeds containing atleast one of the keywords from the list will be processed.' +
            ' If no keyword is provided, feeds will not be filtered and all RSS feeds will be processed',
        constraintDescription: 'Please enter the keyword to use to filter RSS news feed'
    });

    const _newsFeedConfigParam = new cdk.CfnParameter(stack, 'Config', {
        type: 'String',
        description:
            'Provide configuration for RSS feeds. This parameter should be configured as a JSON string. Here is a sample configuration ' +
            '{"country":"ALL", "language":"ALL", "topic":"ALL"}. For Country and language use ISO code. The list of superset of all supported topics ' +
            'is: "tech", "news", "business", "science", "finance", "food", "politics", "economics", "travel", "entertainment", "music", "sport", "world".' +
            'Note: not all topics are supported for each RSS provider. Setting the value as "ALL", is treated as a wild character search',
        default: '{"country":"ALL", "language":"ALL", "topic":"ALL"}'
    });

    const _rssNewsFeedIngestFreq = new cdk.CfnParameter(stack, 'RSSNewsFeedIngestFrequency', {
        type: 'String',
        default: 'cron(0 23 * * ? *)', // default once a day at GMT 23:00 hours
        description:
            'The frequency at which RSS Feeds should be pulled. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
        allowedPattern: _cronRegex,
        constraintDescription:
            "Please provide a valid cron expression of the format 'cron(0/5 * * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
    });

    const s3AccessLoggingBucket = new s3.Bucket(stack, 'AccessLog', {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        enforceSSL: true
    });

    const _deployYoutubeCommentsIngestion = new cdk.CfnParameter(stack, 'DeployYouTubeCommentsIngestion', {
        type: 'String',
        default: 'Yes',
        allowedValues: ['Yes', 'No'],
        description:
            'Would you like to deploy YouTube comments ingestion mechanism. If you answer yes, YouTubeVideoSearchQuery and YouTubeSearchIngestionFreq parameters are mandatory'
    });

    const _youtubeVideoSearchFreq = new cdk.CfnParameter(stack, 'YouTubeSearchIngestionFreq', {
        type: 'String',
        default: 'cron(0 12 * * ? *)',
        allowedPattern: `^$|${_cronRegex}`,
        description: 'Required: The frequency at which at which YouTube comments should be retrieved',
        constraintDescription:
            "Please provide a valid cron expression of the formation 'cron(0 12 * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
    });

    const _youtubeAPIKey = new cdk.CfnParameter(stack, 'YoutubeAPIKey', {
        type: 'String',
        description: 'The key name where Youtube API credentails are stored',
        allowedPattern: '^(?!\\s*$).+',
        default: '/discovering-hot-topics-using-machine-learning/youtube/comments',
        constraintDescription: 'Please provide the SSM Key for Youtube API'
    });

    const _youtubeVideoSearchQuery = new cdk.CfnParameter(stack, 'YoutubeSearchQuery', {
        type: 'String',
        description:
            'Please provide the keywords to search for on Youtube. You can use NOT (-) and OR (|) operators to find videos. ' +
            "Example 'boating|sailing -fishing'. For details refer API documentation on this link https://developers.google.com/youtube/v3/docs/search/list",
        minLength: 0,
        maxLength: 500,
        default: 'movie trailers',
        constraintDescription: 'Please provide key words for Youtube search query'
    });

    const _deployCustomIngestion = new cdk.CfnParameter(stack, 'DeployCustomIngestion', {
        type: 'String',
        description: 'Required: Would you like to deploy custom data ingestion from an S3 bucket.',
        default: 'Yes',
        allowedValues: ['Yes', 'No']
    });

    const _deployRedditIngestion = new cdk.CfnParameter(stack, 'DeployRedditIngestion', {
        type: 'String',
        default: 'Yes',
        allowedValues: ['Yes', 'No'],
        description:
            'Required: Would you like to deploy the news feed ingestion mechanism. If you answer yes, Config and RSSNewsFeedIngestFrequency parameters are mandatory'
    });

    const _redditAPIKey = new cdk.CfnParameter(stack, 'RedditAPIKey', {
        type: 'String',
        description:
            'Required: The SSM parameter key name where the Reddit API credentials detailare stored. For ' +
            'details about how and where to store the API credentials, please refer the implementation guide for this solution',
        default: '/discovering-hot-topics-using-machine-learning/reddit/comments',
        allowedPattern: '^$|^(?!\\s*$).+',
        constraintDescription: 'Please provide the SSM key for Reddit API'
    });

    const _subRedditIngestionFreq = new cdk.CfnParameter(stack, 'RedditIngestionFrequency', {
        type: 'String',
        description: 'Required: The Polling frequency at which the system should ingest comments from subreddits',
        default: 'cron(0/60 * * * ? *)',
        allowedPattern: `^$|${_cronRegex}`
    });

    const _subRedditsToFollow = new cdk.CfnParameter(stack, 'SubRedditsToFollow', {
        type: 'String',
        description:
            'Optional: Please provide the list of SubReddits to follow as comma separated list. Alternatively you ' +
            'can also set the list in the DynamoDB table. For details on the DynamoDB configuration, please refer our implementation guide',
        constraintDescription: '',
        allowedPattern: '^$|[^,(?! )]+',
        default: 'r/aws,r/MachineLearning'
    });

    new Ingestion(stack, 'Ingestion', {
        rssNewsFeedConfig: _newsFeedConfigParam,
        rssNewsFeedQueryParameter: _newsSearchQuery,
        rssNewsFeedIngestFreq: _rssNewsFeedIngestFreq,
        s3LoggingBucket: s3AccessLoggingBucket,
        deployRSSNewsFeeds: _deployRSSFeeds,
        deployYouTubeComments: _deployYoutubeCommentsIngestion,
        youTubeSearchFreq: _youtubeVideoSearchFreq,
        youTubeSearchQuery: _youtubeVideoSearchQuery,
        youtTubeApiKey: _youtubeAPIKey,
        deployCustomIngestion: _deployCustomIngestion,
        deployRedditIngestion: _deployRedditIngestion,
        subRedditsToFollow: _subRedditsToFollow,
        redditIngestionFreq: _subRedditIngestionFreq,
        redditAPIKey: _redditAPIKey,
        metadataNS: 'metadata.call_analytics',
        integrationEventBus: new events.EventBus(stack, 'TestBus')
    });
});
