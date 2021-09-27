#!/usr/bin/env node
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

import { AnyPrincipal, Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { Ingestion } from './ingestion/ingestion-construct';
import { PlatformType } from './ingestion/platform-type';
import { AppIntegration } from './integration/app-integration-construct';
import { QuickSightStack } from './quicksight-custom-resources/quicksight-stack';
import { SolutionHelper } from './solution-helper/solution-helper-construct';
import { TextOrchestration } from './text-analysis-workflow/text-orchestration-construct';
import { TopicOrchestration } from './topic-analysis-workflow/topic-orchestration-construct';

export interface DiscoveringHotTopicsStackProps extends cdk.StackProps {
    readonly description: string;
}

export class DiscoveringHotTopicsStack extends cdk.Stack {
    static readonly cronRegex = '(cron\\(\\s*($|#|\\w+\\s*=|(\\?|\\*|(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?(?:,(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?)*)\\s+(\\?|\\*|(?:[0-5]?\\d)(?:(?:-|\\/|'+
        '\\,)(?:[0-5]?\\d))?(?:,(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?)*)\\s+(\\?|\\*|(?:[01]?\\d|2[0-3])(?:(?:-|\\/|\\,)(?:[01]?\\d|2[0-3]))?(?:,(?:[01]?\\d|2[0-3])(?:(?:-|\\/|'+
        '\\,)(?:[01]?\\d|2[0-3]))?)*)\\s+(\\?|\\*|(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|3[01]))?(?:,(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|'+
        '3[01]))?)*)\\s+(\\?|\\*|(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W|#)?(?:[1-9]|1[012])?(?:,(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W|#)?(?:[1-9]|'+
        '1[012])?)*|\\?|\\*|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?'+
        '(?:,(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?)*)\\s+'+
        '(\\?|\\*|(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?(?:,(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?)*|\\?|\\*|(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?'+
        '(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?)*)(|\\s)+(\\?|\\*|(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?(?:,(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?)*))\\))$'

    constructor(scope: cdk.Construct, id: string, props: DiscoveringHotTopicsStackProps) {
        super(scope, id, props);

        const _deployTwitter = new cdk.CfnParameter(this, 'DeployTwitter', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description: 'Would you like to deploy Twitter ingestion mechanism. If you answer yes, Please provide parameters for TwitterIngestionSetup'
        });

        const _twitterIngestFreqParam = new cdk.CfnParameter(this, 'TwitterIngestQueryFrequency', {
            type: 'String',
            default: 'cron(0/5 * * * ? *)',
            description: 'Required: The frequency at which API calls will be made to twitter in a cron expression format. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(0/5 * * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _twitterSearchQueryParam = new cdk.CfnParameter(this, 'TwitterSearchQuery', {
            type: 'String',
            description: 'Required:The query you would like to execute on twitter. For details of how write a query and use operators, please go to https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators',
            minLength: 0,
            maxLength: 500,
            default:'entertainment'
        });

        const _twitterSupportedLang = new cdk.CfnParameter(this, 'SupportedLanguages', {
            default: 'en,es',
            description: 'The list of languages to query the Search API with. The super set of languages supported is driven by Amazon Translate. For the latest list of languages, please refer to the Comprehend documentation at this location https://docs.aws.amazon.com/translate/latest/dg/what-is.html#language-pairs',
            maxLength: 43,
            minLength: 0,
            allowedPattern: '^$|([a-z]{2}-[a-z]{2}|[a-z]{2})(,([a-z]{2}-[a-z]{2}|[a-z]{2}))*',
            constraintDescription: 'Provide a list of comma separated language iso-code values, Example: de,en,es,it,pt,fr,ja,ko,zh-cn (no spaces after the comma). The input did not match the validation pattern.'
        });

        const _twitterCredentialKeyPath = new cdk.CfnParameter(this, 'TwitterSSMPathForBearerToken', {
            type: 'String',
            default: '/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter',
            allowedPattern: '^$|^(?!\\s*$).+',
            description: 'Required: The SSM parameter store path of key where the credentials are stored as encrypted string',
            constraintDescription: 'The SSM parameter store path cannot be empty'
        });

        const _deployNewsFeeds = new cdk.CfnParameter(this, 'DeployNewsFeeds', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description: 'Required: Would you like to deploy News feed ingestion mechanism. If you answer yes, Config and RSSNewsFeedIngestFrequency parameters are mandatory'
        });

        const _newsSearchQuery = new cdk.CfnParameter(this, 'NewsSearchQuery', {
            type: 'String',
            description: 'Provide comma separated list of keywords (optional) to filter news feeds. Only feeds containing atleast one of the keywords from the list will be processed.'+
                ' If no keyword is provided, feeds will not be filtered and all news feeds will be processed',
            constraintDescription: 'Please enter the keyword to use to filter news feeds'
        });

        const _newsFeedConfigParam = new cdk.CfnParameter(this, 'NewsFeedIngestConfig', {
            type: 'String',
            description: 'Provide configuration for RSS feeds. This parameter should be configured as a JSON string. Here is a sample configuration '+
                '{"country":"ALL", "language":"ALL", "topic":"ALL"}. For Country and language use ISO code. The list of superset of all supported topics '+
                'is: "tech", "news", "business", "science", "finance", "food", "politics", "economics", "travel", "entertainment", "music", "sport", "world".' +
                'Note: not all topics are supported for each RSS provider. Setting the value as "ALL", is treated as a wild character search',
            default: '{"country":"ALL", "language":"ALL", "topic":"ALL"}'
        });

        const _newsFeedIngestFreq = new cdk.CfnParameter(this, 'NewsFeedIngestFrequency', {
            type: 'String',
            default: 'cron(0 18 * * ? *)', // default once a day at GMT 20:00 hours
            description: 'Required: The frequency at which RSS Feeds should be pulled. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(0 18 * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _deployYoutubeCommentsIngestion = new cdk.CfnParameter(this, 'DeployYouTubeCommentsIngestion', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description: 'Required: Would you like to deploy YouTube comments ingestion mechanism. If you answer yes, YouTubeVideoSearchQuery and YouTubeSearchIngestionFreq parameters are mandatory'
        });

        const _youtubeVideoSearchFreq = new cdk.CfnParameter(this, 'YouTubeSearchIngestionFreq', {
            type: 'String',
            default: 'cron(0 12 * * ? *)',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            description: 'Required: The frequency at which at which YouTube comments should be retrieved',
            constraintDescription: 'Please provide a valid cron expression of the formation \'cron(0 12 * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _youtubeAPIKey = new cdk.CfnParameter(this, 'YoutubeAPIKey', {
            type: 'String',
            description: 'The key name where Youtube API credentails are stored',
            allowedPattern: '^$|^(?!\\s*$).+',
            default: '/discovering-hot-topics-using-machine-learning/youtube/comments',
            constraintDescription: 'Please provide the SSM Key for Youtube API'
        });

        const _youtubeChannelId = new cdk.CfnParameter(this, 'YouTubeChannel', {
            type: 'String',
            description: 'Optional parameter to retrieve comments data from videos from a specific channel. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            allowedPattern: '^$|^(?!\\s*$).+',
            constraintDescription: 'Please provide a valid YouTube Channel ID'
        });

        const _youtubeVideoSearchQuery = new cdk.CfnParameter(this, 'YoutubeSearchQuery', {
            type: 'String',
            description: 'Optional search parameter to specify keywords to search for on Youtube. You can use NOT (-) and OR (|) operators to find videos. '+
            'Example \'boating|sailing -fishing\'. For details refer API documentation on this link https://developers.google.com/youtube/v3/docs/search/list. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            minLength: 0,
            maxLength: 500,
            default: 'movie trailers',
            constraintDescription: 'Please provide key words for Youtube search query'
        });

        const _topicSchedule = new cdk.CfnParameter(this, 'TopicAnalysisFrequency', {
            type: 'String',
            default: 'cron(10 0 * * ? *)',
            allowedPattern: DiscoveringHotTopicsStack.cronRegex,
            description: 'Required: The frequency at which the topic analysis job should run. The minimum is an hour. It is recommened That the job be run a few mins after the hour e.g 10 mins after the hour',
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(10 0 * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _numberOfTopics = new cdk.CfnParameter(this, 'NumberOfTopics', {
            type: 'Number',
            default: '10',
            minValue: 1,
            maxValue: 100,
            description: 'Required: The number of topics to be discovered by Topic analysis. The min value is 1 and maximum value is 100',
            constraintDescription: 'Please verify if the value entered for number of topics to be discovered is between 1 and 100 (both inclusive).'
        });

        const _quickSightPrincipalArn = new cdk.CfnParameter(this, 'QuickSightPrincipalArn', {
            type: 'String',
            description: 'The Amazon QuickSight principal arn used in the permissions of QuickSight resources. If you do not wish to deploy QuickSight visuals, leave it blank. This Arn can be'+
                ' obtained by executing the AWS CLI command: aws quicksight list-users --region <aws-region> --aws-account-id <account-id> --namespace <namespace-name>. The expected Arn '+
                ' format is : arn:aws:quicksight:<aws-region>:<aws-account-id>:user/<quicksight-namespace>/<quicksight-admin-group-name>/<user-name>.'+
                ' (Example arn:aws:quicksight:<aws-region>:<aws-account-id>:user/default/Admin/<user-name>. ).',
            allowedPattern: '^$|^arn:\\S+:quicksight:\\S+:\\d{12}:user/\\S+$',
            constraintDescription: 'Provide an arn matching an Amazon Quicksight User ARN. The input did not match the validation pattern. If you do not wish to deploy QuickSight visuals, leave it blank'
        });

        cdk.Stack.of(this).templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: [{
                    Label: { default: 'TwitterIngestionSetup' },
                    Parameters: [
                        _deployTwitter.logicalId,
                        _twitterSearchQueryParam.logicalId,
                        _twitterCredentialKeyPath.logicalId,
                        _twitterIngestFreqParam.logicalId,
                        _twitterSupportedLang.logicalId,
                    ]
                }, {
                    Label: { default: 'NewsFeedIngestionSetup' },
                    Parameters: [
                        _deployNewsFeeds.logicalId,
                        _newsFeedIngestFreq.logicalId,
                        _newsSearchQuery.logicalId,
                        _newsFeedConfigParam.logicalId,
                    ]
                }, {
                    Label: { default: 'YouTubeCommentsSetup' },
                    Parameters: [
                        _deployYoutubeCommentsIngestion.logicalId,
                        _youtubeVideoSearchFreq.logicalId,
                        _youtubeChannelId.logicalId,
                        _youtubeVideoSearchQuery.logicalId,
                        _youtubeAPIKey.logicalId
                    ]
                }, {
                    Label: { default: 'General Parameters' },
                    Parameters: [
                        _topicSchedule.logicalId,
                        _numberOfTopics.logicalId,
                        _quickSightPrincipalArn.logicalId
                    ]
                }]
            }
        }

        new cdk.CfnRule(this, 'TwitterIngestionParamValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployTwitter.logicalId), "No"),
            assertions: [{
                assert: cdk.Fn.conditionOr(cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), "Yes"), cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), "Yes")),
                assertDescription: 'If "DeployTwitter" is set to "No", then "DeployNewsFeeds" or "DeployYouTubeCommentsIngestion" should be set to "Yes". At least one of the ingestion mechanisms should be selected'
            }]
        });

        new cdk.CfnRule(this, 'NewsFeedsIngestionParamValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), "No"),
            assertions: [{
                assert: cdk.Fn.conditionOr(cdk.Fn.conditionEquals(cdk.Fn.ref(_deployTwitter.logicalId), "Yes"), cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), "Yes")),
                assertDescription: 'If "DeployNewsFeeds" is set to "No", then "DeployTwitter" or "DeployYouTubeCommentsIngestion" should be set to "Yes". At least one of the ingestion mechanisms should be selected'
            }]
        });

        new cdk.CfnRule(this, 'DeployYouTubeCommentsIngestionValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), "No"),
            assertions: [{
                assert: cdk.Fn.conditionOr(cdk.Fn.conditionEquals(cdk.Fn.ref(_deployTwitter.logicalId), "Yes"), cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), "Yes")),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "No", then "DeployTwitter" or "DeployNewsFeeds" should be set to "Yes". At least one of the ingestion mechanisms should be selected'
            }]
        });

        new cdk.CfnRule(this, 'ValidateTwitterMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployTwitter.logicalId), "Yes"),
            assertions: [{
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_twitterIngestFreqParam.logicalId), "")),
                assertDescription: 'If "DeployTwitter" is set to "Yes", then "TwitterIngestQueryFrequency" should be provided. It cannot be blank'
            }, {
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_twitterCredentialKeyPath.logicalId), "")),
                assertDescription: 'If "DeployTwitter" is set to "Yes", then "TwitterSSMPathForBearerToken" should be provided. It cannot be blank'
            }, {
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_twitterSearchQueryParam.logicalId), "")),
                assertDescription: 'If "DeployTwitter" is set to "Yes" then "TwitterSearchQuery" should be provided. It cannot be blank'
            }]
        });

        new cdk.CfnRule(this, 'ValidateNewsFeedsMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), "Yes"),
            assertions: [{
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_newsFeedIngestFreq.logicalId), "")),
                assertDescription: 'If "DeployNewsFeeds" is set to "Yes", then "NewsFeedIngestFrequency" should be provided. It cannot be blank'
            }]
        });

        new cdk.CfnRule(this, 'ValidateYouTubeCommentsMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), "Yes"),
            assertions: [{
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeVideoSearchFreq.logicalId), "")),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "Yes" then "YouTubeSearchIngestionFreq" should be provided. It cannot be blank'
            }, {
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionAnd(
                    cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeVideoSearchQuery.logicalId), ""),
                    cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeChannelId.logicalId), "")), ),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "Yes" then atleast one parameter from "YouTubeVideoSearchQuery" and "YouTubeChannel" should be provided. Both cannot be blank'
            }, {
                assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeAPIKey.logicalId), "")),
                assertDescription: 'If "DeployYouTubeCommentsIngestion" is set to "Yes" then "YoutubeAPIKey" should be provided. It cannot be blank'
            }]
        });

        const solutionID = this.node.tryGetContext('solution_id');
        const solutionName = this.node.tryGetContext('solution_name');
        const solutionVersion = this.node.tryGetContext('solution_version')

        new SolutionHelper(this, 'SolutionHelper', {
            solutionId: solutionID,
            searchQuery: _twitterSearchQueryParam.valueAsString,
            langFilter: _twitterSupportedLang.valueAsString,
            solutionVersion: solutionVersion,
            newsFeedsIngestionSearchQuery: _newsSearchQuery.valueAsString,
            newsFeedIngestionFreq: _newsFeedIngestFreq? _newsFeedIngestFreq.valueAsString: '',
            twitterIngestionFreq: _twitterIngestFreqParam.valueAsString,
            topicModelingFreq: _topicSchedule.valueAsString,
            youTubeIngestionFreq: _youtubeVideoSearchFreq.valueAsString,
            youTubeSearchQuery: _youtubeVideoSearchQuery.valueAsString,
            youTubeChannelID: _youtubeChannelId.valueAsString
        });

        const s3AccessLoggingBucket = new s3.Bucket(this, 'AccessLog', {
            versioned: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        s3AccessLoggingBucket.addToResourcePolicy(new PolicyStatement({
            sid: 'HttpsOnly',
            resources: [
                `${s3AccessLoggingBucket.bucketArn}/*`
            ],
            actions: ['*'],
            principals: [new AnyPrincipal()],
            effect: Effect.DENY,
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        }));

        (s3AccessLoggingBucket.node.defaultChild as s3.CfnBucket).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: 'This S3 bucket is used as the access logging bucket for another bucket'
                }]
            }
        };

        const _deployQuickSightCondition = new cdk.CfnCondition(this, 'DeployQuickSight', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(_quickSightPrincipalArn, ""))
        });

        const qsNestedTemplate = new QuickSightStack(this, 'QSDashboard', {
            parameters: {
                "QuickSightSourceTemplateArn": this.node.tryGetContext('quicksight_source_template_arn'),
                "QuickSightPrincipalArn": _quickSightPrincipalArn.valueAsString,
                "SolutionID": solutionID,
                "SolutionName": solutionName,
                "ParentStackName": cdk.Aws.STACK_NAME
            }
        });

        qsNestedTemplate.nestedStackResource!.addMetadata('nestedStackFileName', qsNestedTemplate.templateFile.slice(0, -5));
        qsNestedTemplate.nestedStackResource?.addOverride('Condition', _deployQuickSightCondition.logicalId);

        const storageConfig: Map<string, string> = new Map();
        storageConfig.set('Sentiment', 'sentiment');
        storageConfig.set('Entity', 'entity');
        storageConfig.set('KeyPhrase', 'keyphrase');
        storageConfig.set('Topics', 'topics');
        storageConfig.set('TopicMappings', 'topicmappings');
        storageConfig.set('TxtInImgEntity', 'txtinimgentity');
        storageConfig.set('TxtInImgSentiment', 'txtinimgsentiment');
        storageConfig.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
        storageConfig.set('ModerationLabels', 'moderationlabels');
        storageConfig.set('TwFeedStorage', 'twfeedstorage');
        storageConfig.set('NewsFeedStorage', 'newsfeedstorage');
        storageConfig.set('YouTubeComments', 'youtubecomments');

        // start of workflow -> storage integration
        const textInferenceNameSpace = 'com.analyze.text.inference';
        const topicsAnalysisInfNameSpace = 'com.analyze.topic.inference.topics';
        const topicMappingsInfNameSpace = 'com.analyze.topic.inference.mappings';
        const appIntegration = new AppIntegration(this, 'InfOutput', {
            textAnalysisInfNS: textInferenceNameSpace,
            topicsAnalysisInfNS: topicsAnalysisInfNameSpace,
            topicMappingsInfNS: topicMappingsInfNameSpace,
            tableMappings: storageConfig,
            s3LoggingBucket: s3AccessLoggingBucket
        });
        // start of workflow -> storage integration

        // start creation of Kinesis consumer that invokes state machine
        const _ingestion = new Ingestion(this, 'Ingestion', {
            s3LoggingBucket: s3AccessLoggingBucket,
            deployTwitter: _deployTwitter,
            ingestFrequency: _twitterIngestFreqParam,
            twitterQueryParameter: _twitterSearchQueryParam,
            supportedLang: _twitterSupportedLang,
            credentialKeyPath : _twitterCredentialKeyPath,
            deployRSSNewsFeeds: _deployNewsFeeds,
            rssNewsFeedConfig: _newsFeedConfigParam,
            rssNewsFeedQueryParameter: _newsSearchQuery,
            rssNewsFeedIngestFreq: _newsFeedIngestFreq,
            deployYouTubeComments: _deployYoutubeCommentsIngestion,
            youTubeSearchFreq: _youtubeVideoSearchFreq,
            youTubeSearchQuery: _youtubeVideoSearchQuery,
            youTubeChannel: _youtubeChannelId,
            youtTubeApiKey: _youtubeAPIKey
        });
        // end creation of Lambda Kinesis producer that fetches social media feed

        const ingestionTypes: PlatformType [] = [{
                name: 'TWITTER',
                topicModelling: true
            }, {
                name: 'NEWSFEEDS',
                topicModelling: true
            }, {
                name: 'YOUTUBECOMMENTS',
                topicModelling: true
            }];

        // start creation of step functions state machine and event bus
        const textWorkflowEngine = new TextOrchestration(this, 'TextWfEngine', {
            eventBus: appIntegration.eventManager.eventBus,
            textAnalysisNameSpace: textInferenceNameSpace,
            s3LoggingBucket: s3AccessLoggingBucket,
            lambdaTriggerFunc: _ingestion.consumerLambdaFunc,
            platformTypes: ingestionTypes,
        });

        new TopicOrchestration(this, 'TopicWFEngine', {
            topicsAnalaysisNameSpace: topicsAnalysisInfNameSpace,
            topicMappingsNameSpace: topicMappingsInfNameSpace,
            eventBus: appIntegration.eventManager.eventBus,
            rawBucket: textWorkflowEngine.s3Bucket,
            platformTypes: ingestionTypes,
            ingestionWindow: '24', // number of days x 24
            numberofTopics: cdk.Token.asString(_numberOfTopics.value),
            topicSchedule: _topicSchedule.valueAsString,
            s3LoggingBucket: s3AccessLoggingBucket,
        });
        // end creation of step functions state machine and event bus

        new cdk.CfnOutput(this, 'QSAnalysisURL', {
            value: qsNestedTemplate.analysisURLOutput,
            description: 'Amazon QuickSight URL for analysis',
            condition: _deployQuickSightCondition
        });

        new cdk.CfnOutput(this, 'QSDashboardURL', {
            value: qsNestedTemplate.dashboardURLOutput,
            description: 'Amazon QuickSight URL for dashboard',
            condition: _deployQuickSightCondition
        });
    }
}
