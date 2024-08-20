#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
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
    // regex expression to validate cloudwatch cron expressions. For documentation and examples, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
    static readonly cronRegex =
        '(cron\\(\\s*($|#|\\w+\\s*=|(\\?|\\*|(?:[0-6]?\\d)(?:(?:-|\\/|\\,)(?:[0-6]?\\d))?(?:,(?:[0-6]?\\d)(?:(?:-|\\/|\\,)(?:[0-6]?\\d))?)*)\\s+(\\?|\\*|(?:[0-6]?\\d)(?:(?:-|\\/|' +
        '\\,)(?:[0-6]?\\d))?(?:,(?:[0-6]?\\d)(?:(?:-|\\/|\\,)(?:[0-6]?\\d))?)*)\\s+(\\?|\\*|(?:[01]?\\d|2[0-3])(?:(?:-|\\/|\\,)(?:[01]?\\d|2[0-3]))?(?:,(?:[01]?\\d|2[0-3])(?:(?:-|\\/|' +
        '\\,)(?:[01]?\\d|2[0-3]))?)*)\\s+(\\?|\\*|(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|3[01]))?(?:,(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|' +
        '3[01]))?)*)\\s+(\\?|\\*|(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W|#)?(?:[1-9]|1[012])?(?:,(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W|#)?(?:[1-9]|' +
        '1[012])?)*|\\?|\\*|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?' +
        '(?:,(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?)*)\\s+' +
        '(\\?|\\*|(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?(?:,(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?)*|\\?|\\*|(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?' +
        '(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?)*)(|\\s)+(\\?|\\*|(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?(?:,(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?)*))\\))$';

    constructor(scope: Construct, id: string, props: DiscoveringHotTopicsStackProps) {
        super(scope, id, props);

        const _deployNewsFeeds = new cdk.CfnParameter(this, 'DeployNewsFeeds', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description:
                'Required: Would you like to deploy the news feed ingestion mechanism. If you answer yes, Config and RSSNewsFeedIngestFrequency parameters are mandatory'
        });

        const _newsSearchQuery = new cdk.CfnParameter(this, 'NewsSearchQuery', {
            type: 'String',
            description:
                'Provide a comma separated list of keywords (optional) to filter news feeds. Only feeds containing at least one of the keywords from the list will be processed.' +
                ' If no keyword is provided, feeds will not be filtered and all news feeds will be processed',
            constraintDescription: 'Please enter the keyword to use to filter news feeds',
            minLength: 0,
            maxLength: 500,
            default: 'Amazon, AWS'
        });

        const _newsFeedConfigParam = new cdk.CfnParameter(this, 'NewsFeedIngestConfig', {
            type: 'String',
            description:
                'Provide configuration for RSS feeds. This parameter should be configured as a JSON string. Here is a sample configuration ' +
                '{"country":"ALL", "language":"ALL", "topic":"ALL"}. For Country and language use ISO code. The list of superset of all supported topics ' +
                'is: "tech", "news", "business", "science", "finance", "food", "politics", "economics", "travel", "entertainment", "music", "sport", "world".' +
                'Note: not all topics are supported for each RSS provider. Setting the value as "ALL", is treated as a wild character search',
            default: '{"country":"ALL", "language":"en", "topic":"news"}'
        });

        const _newsFeedIngestFreq = new cdk.CfnParameter(this, 'NewsFeedIngestFrequency', {
            type: 'String',
            default: 'cron(0 18 * * ? *)', // default once a day at GMT 18:00 hours
            description:
                'Required: The frequency at which RSS Feeds should be pulled. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            constraintDescription:
                "Please provide a valid cron expression of the format 'cron(0 18 * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
        });

        const _deployYoutubeCommentsIngestion = new cdk.CfnParameter(this, 'DeployYouTubeCommentsIngestion', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description:
                'Required: Would you like to deploy the YouTube comments ingestion mechanism. If you answer yes, YouTubeVideoSearchQuery and YouTubeSearchIngestionFreq parameters are mandatory'
        });

        const _youtubeVideoSearchFreq = new cdk.CfnParameter(this, 'YouTubeSearchIngestionFreq', {
            type: 'String',
            default: 'cron(0 12 * * ? *)',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            description: 'Required: The frequency at which at which YouTube comments should be retrieved',
            constraintDescription:
                "Please provide a valid cron expression of the formation 'cron(0 12 * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
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
            description:
                'Optional parameter to retrieve comments data from videos from a specific channel. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            allowedPattern: '^$|^(?!\\s*$).+',
            constraintDescription: 'Please provide a valid YouTube Channel ID',
            minLength: 0,
            maxLength: 500
        });

        const _youtubeVideoSearchQuery = new cdk.CfnParameter(this, 'YoutubeSearchQuery', {
            type: 'String',
            description:
                'Optional search parameter to specify the keywords to search for on Youtube. You can use NOT (-) and OR (|) operators to find videos. ' +
                'Example \'boating|sailing -fishing\'. For details refer API documentation on this link https://developers.google.com/youtube/v3/docs/search/list. At least one parameter from "YouTubeChannel" and "YoutubeSearchQuery" has to be provided.',
            minLength: 0,
            maxLength: 500,
            default: 'Amazon Web Services|AWS',
            constraintDescription: 'Please provide key words for Youtube search query'
        });

        const _deployCustomIngestion = new cdk.CfnParameter(this, 'DeployCustomIngestion', {
            type: 'String',
            description: 'Required: Would you like to deploy custom data ingestion from an S3 bucket.',
            default: 'Yes',
            allowedValues: ['Yes', 'No']
        });

        const _topicSchedule = new cdk.CfnParameter(this, 'TopicAnalysisFrequency', {
            type: 'String',
            default: 'cron(10 0 * * ? *)',
            allowedPattern: DiscoveringHotTopicsStack.cronRegex,
            description:
                'Required: The frequency at which the topic analysis job should run. The minimum is an hour. It is recommened That the job be run a few minutes after the hour e.g 10 minutes after the hour',
            constraintDescription:
                "Please provide a valid cron expression of the format 'cron(10 0 * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
        });

        const _numberOfTopics = new cdk.CfnParameter(this, 'NumberOfTopics', {
            type: 'Number',
            default: '10',
            minValue: 1,
            maxValue: 100,
            description:
                'Required: The number of topics to be discovered by topic analysis. The minimum value is 1 and maximum value is 100',
            constraintDescription:
                'Please verify if the value entered for the number of topics to be discovered is between 1 and 100 (both inclusive).'
        });

        const _quickSightPrincipalArn = new cdk.CfnParameter(this, 'QuickSightPrincipalArn', {
            type: 'String',
            description:
                'The Amazon QuickSight principal arn used in the permissions of QuickSight resources. If you do not wish to deploy QuickSight visuals, leave it blank. This Arn can be' +
                ' obtained by executing the AWS CLI command: aws quicksight list-users --region <aws-region> --aws-account-id <account-id> --namespace <namespace-name>. The expected Arn ' +
                ' format is : arn:aws:quicksight:<aws-region>:<aws-account-id>:user/<quicksight-namespace>/<quicksight-admin-group-name>/<user-name>.' +
                ' (Example arn:aws:quicksight:<aws-region>:<aws-account-id>:user/default/Admin/<user-name>. ).',
            allowedPattern: '^$|^arn:\\S+:quicksight:\\S+:\\d{12}:user/\\S+$',
            constraintDescription:
                'Provide an arn matching an Amazon Quicksight User ARN. The input did not match the validation pattern. If you do not wish to deploy QuickSight visuals, leave it blank'
        });

        const _deployRedditIngestion = new cdk.CfnParameter(this, 'DeployRedditIngestion', {
            type: 'String',
            default: 'Yes',
            allowedValues: ['Yes', 'No'],
            description:
                'Required: Would you like to deploy the news feed ingestion mechanism. If you answer yes, Config and RSSNewsFeedIngestFrequency parameters are mandatory'
        });

        const _redditAPIKey = new cdk.CfnParameter(this, 'RedditAPIKey', {
            type: 'String',
            description:
                'Required: The SSM parameter key name where the Reddit API credentials detailare stored. For ' +
                'details about how and where to store the API credentials, please refer the implementation guide for this solution',
            default: '/discovering-hot-topics-using-machine-learning/reddit/comments',
            allowedPattern: '^$|^(?!\\s*$).+',
            constraintDescription: 'Please provide the SSM key for Reddit API'
        });

        const _subRedditIngestionFreq = new cdk.CfnParameter(this, 'RedditIngestionFrequency', {
            type: 'String',
            description: 'Required: The Polling frequency at which the system should ingest comments from subreddits',
            default: 'cron(0/60 * * * ? *)',
            allowedPattern: `^$|${DiscoveringHotTopicsStack.cronRegex}`,
            constraintDescription:
                'Please provide a valid scron expression for the format "cron(0/60 * * * ? *)". For details on CloudWatch cron expressions, please navigate to https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const _subRedditsToFollow = new cdk.CfnParameter(this, 'SubRedditsToFollow', {
            type: 'String',
            description:
                'Optional: Please provide the list of SubReddits to follow as comma separated list. Alternatively you ' +
                'can also set the list in the DynamoDB table. For details on the DynamoDB configuration, please refer our implementation guide',
            constraintDescription: '',
            allowedPattern: '^$|[r\\/\\w+]+([,r\\/\\w+])*',
            default: 'r/aws,r/MachineLearning'
        });

        cdk.Stack.of(this).templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: [
                    {
                        Label: { default: 'NewsFeedIngestionSetup' },
                        Parameters: [
                            _deployNewsFeeds.logicalId,
                            _newsFeedIngestFreq.logicalId,
                            _newsSearchQuery.logicalId,
                            _newsFeedConfigParam.logicalId
                        ]
                    },
                    {
                        Label: { default: 'YouTubeCommentsSetup' },
                        Parameters: [
                            _deployYoutubeCommentsIngestion.logicalId,
                            _youtubeVideoSearchFreq.logicalId,
                            _youtubeChannelId.logicalId,
                            _youtubeVideoSearchQuery.logicalId,
                            _youtubeAPIKey.logicalId
                        ]
                    },
                    {
                        Label: { default: 'RedditIngestion' },
                        Parameters: [
                            _deployRedditIngestion.logicalId,
                            _redditAPIKey.logicalId,
                            _subRedditIngestionFreq.logicalId,
                            _subRedditsToFollow.logicalId
                        ]
                    },
                    {
                        Label: { default: 'CustomIngestionSetup' },
                        Parameters: [_deployCustomIngestion.logicalId]
                    },
                    {
                        Label: { default: 'General Parameters' },
                        Parameters: [
                            _topicSchedule.logicalId,
                            _numberOfTopics.logicalId,
                            _quickSightPrincipalArn.logicalId
                        ]
                    }
                ]
            }
        };

        new cdk.CfnRule(this, 'NewsFeedsIngestionParamValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), 'No'),
            assertions: [
                {
                    assert: cdk.Fn.conditionOr(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployCustomIngestion.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployRedditIngestion.logicalId), 'Yes')
                    ),
                    assertDescription:
                        'If "DeployNewsFeeds" is set to "No", then at least one of "DeployYouTubeCommentsIngestion", "DeployRedditIngestion", or "DeployCustomIngestion" should be set to "Yes". At least one ingestion mechanism is required.'
                }
            ]
        });

        new cdk.CfnRule(this, 'DeployYouTubeCommentsIngestionValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), 'No'),
            assertions: [
                {
                    assert: cdk.Fn.conditionOr(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployCustomIngestion.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployRedditIngestion.logicalId), 'Yes')
                    ),
                    assertDescription:
                        'If "DeployYouTubeCommentsIngestion" is set to "No", then at least one of "DeployNewsFeeds", "DeployRedditIngestion", or "DeployCustomIngestion" should be set to "Yes". At least one ingestion mechanism is required.'
                }
            ]
        });

        new cdk.CfnRule(this, 'DeployRedditIngestionValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployRedditIngestion.logicalId), 'No'),
            assertions: [
                {
                    assert: cdk.Fn.conditionOr(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployCustomIngestion.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), 'Yes')
                    ),
                    assertDescription:
                        'If "DeployRedditIngestion" is set to "No", then at least one of "DeployYouTubeCommentsIngestion", "DeployNewsFeeds", "DeployCustomIngestion" should be set to "Yes". At least one ingestion mechanism is required.'
                }
            ]
        });

        new cdk.CfnRule(this, 'DeployCustomIngestionValidation', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployCustomIngestion.logicalId), 'No'),
            assertions: [
                {
                    assert: cdk.Fn.conditionOr(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), 'Yes'),
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_deployRedditIngestion.logicalId), 'Yes')
                    ),
                    assertDescription:
                        'If "DeployCustomIngestion" is set to "No", then at least one of "DeployNewsFeeds" or "DeployYouTubeCommentsIngestion" should be set to "Yes". At least one ingestion mechanism is required.'
                }
            ]
        });

        new cdk.CfnRule(this, 'ValidateNewsFeedsMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployNewsFeeds.logicalId), 'Yes'),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_newsFeedIngestFreq.logicalId), '')),
                    assertDescription:
                        'If "DeployNewsFeeds" is set to "Yes", then "NewsFeedIngestFrequency" should be provided. It cannot be blank'
                }
            ]
        });

        new cdk.CfnRule(this, 'ValidateYouTubeCommentsMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployYoutubeCommentsIngestion.logicalId), 'Yes'),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeVideoSearchFreq.logicalId), '')
                    ),
                    assertDescription:
                        'If "DeployYouTubeCommentsIngestion" is set to "Yes" then "YouTubeSearchIngestionFreq" should be provided. It cannot be blank'
                },
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionAnd(
                            cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeVideoSearchQuery.logicalId), ''),
                            cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeChannelId.logicalId), '')
                        )
                    ),
                    assertDescription:
                        'If "DeployYouTubeCommentsIngestion" is set to "Yes" then at least one parameter from "YouTubeVideoSearchQuery" and "YouTubeChannel" should be provided. Both cannot be blank'
                },
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_youtubeAPIKey.logicalId), '')),
                    assertDescription:
                        'If "DeployYouTubeCommentsIngestion" is set to "Yes" then "YoutubeAPIKey" should be provided. It cannot be blank'
                }
            ]
        });

        new cdk.CfnRule(this, 'ValidateRedditIngestionMandatoryParam', {
            ruleCondition: cdk.Fn.conditionEquals(cdk.Fn.ref(_deployRedditIngestion.logicalId), 'Yes'),
            assertions: [
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_redditAPIKey.logicalId), '')),
                    assertDescription:
                        'If "DeployRedditIngestion" is set to "Yes" then "RedditAPIKey" should be provided. It cannot be blank'
                },
                {
                    assert: cdk.Fn.conditionNot(
                        cdk.Fn.conditionEquals(cdk.Fn.ref(_subRedditIngestionFreq.logicalId), '')
                    ),
                    assertDescription:
                        'If "DeployRedditIngestion" is set to "Yes" then "RedditIngestionFrequency" should be provided. It cannot be blank'
                },
                {
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(cdk.Fn.ref(_subRedditsToFollow.logicalId), '')),
                    assertDescription:
                        'If "DeployRedditIngestion" is set to "Yes" then "SubRedditsToFollow" should be provided. It cannot be blank'
                }
            ]
        });

        const solutionID = this.node.tryGetContext('solution_id');
        const solutionName = this.node.tryGetContext('solution_name');
        const solutionVersion = this.node.tryGetContext('solution_version');

        new SolutionHelper(this, 'SolutionHelper', {
            solutionId: solutionID,
            solutionVersion: solutionVersion,
            deployNewsFeedIngestion: _deployNewsFeeds.valueAsString,
            newsFeedsIngestionSearchQuery: _newsSearchQuery.valueAsString,
            newsFeedIngestionFreq: _newsFeedIngestFreq ? _newsFeedIngestFreq.valueAsString : '',
            topicModelingFreq: _topicSchedule.valueAsString,
            deployYoutubeIngestion: _deployYoutubeCommentsIngestion.valueAsString, 
            youTubeIngestionFreq: _youtubeVideoSearchFreq.valueAsString,
            youTubeSearchQuery: _youtubeVideoSearchQuery.valueAsString,
            youTubeChannelID: _youtubeChannelId.valueAsString,
            deployRedditIngestion: _deployRedditIngestion.valueAsString,
            redditIngestionFreq: _subRedditIngestionFreq ? _subRedditIngestionFreq.valueAsString : '',
            subredditsToFollow: _subRedditsToFollow ? _subRedditsToFollow.valueAsString : '',
            deployCustomIngestion: _deployCustomIngestion.valueAsString, 
        });

        const s3AccessLoggingBucket = new s3.Bucket(this, 'AccessLog', {
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true
        });

        // using escape hatch to remove the ACL from the bucket, since another construct is putting it back.
        (s3AccessLoggingBucket.node.defaultChild as s3.CfnBucket).addDeletionOverride('Properties.AccessControl');

        (s3AccessLoggingBucket.node.defaultChild as s3.CfnBucket).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W35',
                        reason: 'This S3 bucket is used as the access logging bucket for another bucket'
                    }
                ]
            }
        };

        const _deployQuickSightCondition = new cdk.CfnCondition(this, 'DeployQuickSight', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(_quickSightPrincipalArn, ''))
        });

        const qsNestedTemplate = new QuickSightStack(this, 'QSDashboard', {
            description: `(${this.node.tryGetContext(
                'solution_id'
            )}n-quicksight) - Discovering Hot Topics using Machine Learning nested Quicksight resources - Version %%VERSION%%`,
            parameters: {
                'QuickSightSourceTemplateArn': this.node.tryGetContext('quicksight_source_template_arn'),
                'QuickSightPrincipalArn': _quickSightPrincipalArn.valueAsString,
                'SolutionID': solutionID,
                'SolutionName': solutionName,
                'ParentStackName': cdk.Aws.STACK_NAME
            }
        });

        qsNestedTemplate.nestedStackResource!.addMetadata(
            'nestedStackFileName',
            qsNestedTemplate.templateFile.slice(0, -5)
        );
        qsNestedTemplate.nestedStackResource!.cfnOptions.condition = _deployQuickSightCondition;

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
        storageConfig.set('CustomIngestion', 'customingestion');
        storageConfig.set('CustomIngestionLoudness', 'customingestionloudness');
        storageConfig.set('CustomIngestionItem', 'customingestionitem');
        storageConfig.set('Metadata', 'metadata');
        storageConfig.set('RedditComments', 'redditcomments');

        // start of workflow -> storage integration
        const textInferenceNameSpace = 'com.analyze.text.inference';
        const topicsAnalysisInfNameSpace = 'com.analyze.topic.inference.topics';
        const topicMappingsInfNameSpace = 'com.analyze.topic.inference.mappings';
        const metadataNameSpace = 'metadata.call_analytics';
        const appIntegration = new AppIntegration(this, 'InfOutput', {
            textAnalysisInfNS: textInferenceNameSpace,
            topicsAnalysisInfNS: topicsAnalysisInfNameSpace,
            topicMappingsInfNS: topicMappingsInfNameSpace,
            metadataNS: metadataNameSpace,
            tableMappings: storageConfig,
            s3LoggingBucket: s3AccessLoggingBucket
        });

        // start of workflow -> storage integration

        // start creation of Kinesis consumer that invokes state machine
        const _ingestion = new Ingestion(this, 'Ingestion', {
            s3LoggingBucket: s3AccessLoggingBucket,
            deployRSSNewsFeeds: _deployNewsFeeds,
            rssNewsFeedConfig: _newsFeedConfigParam,
            rssNewsFeedQueryParameter: _newsSearchQuery,
            rssNewsFeedIngestFreq: _newsFeedIngestFreq,
            deployYouTubeComments: _deployYoutubeCommentsIngestion,
            youTubeSearchFreq: _youtubeVideoSearchFreq,
            youTubeSearchQuery: _youtubeVideoSearchQuery,
            youTubeChannel: _youtubeChannelId,
            youtTubeApiKey: _youtubeAPIKey,
            deployCustomIngestion: _deployCustomIngestion,
            deployRedditIngestion: _deployRedditIngestion,
            subRedditsToFollow: _subRedditsToFollow,
            redditIngestionFreq: _subRedditIngestionFreq,
            redditAPIKey: _redditAPIKey,
            integrationEventBus: appIntegration.eventManager.eventBus,
            metadataNS: metadataNameSpace
        });
        // end creation of Lambda Kinesis producer that fetches social media feed

        const ingestionTypes: PlatformType[] = [
            {
                name: 'NEWSFEEDS',
                topicModelling: true
            },
            {
                name: 'YOUTUBECOMMENTS',
                topicModelling: true
            },
            {
                name: 'CUSTOMINGESTION',
                topicModelling: true
            },
            {
                name: 'REDDIT',
                topicModelling: true
            }
        ];

        // start creation of step functions state machine and event bus
        const textWorkflowEngine = new TextOrchestration(this, 'TextWfEngine', {
            eventBus: appIntegration.eventManager.eventBus,
            textAnalysisNameSpace: textInferenceNameSpace,
            s3LoggingBucket: s3AccessLoggingBucket,
            lambdaTriggerFunc: _ingestion.consumerLambdaFunc,
            platformTypes: ingestionTypes
        });

        new TopicOrchestration(this, 'TopicWFEngine', {
            topicsAnalaysisNameSpace: topicsAnalysisInfNameSpace,
            topicMappingsNameSpace: topicMappingsInfNameSpace,
            eventBus: appIntegration.eventManager.eventBus,
            rawBucket: textWorkflowEngine.s3Bucket,
            platformTypes: ingestionTypes,
            ingestionWindow: '24', // number of days x 24 hours, for 1 day, value is 24 hours, 2 days value is 48 hours
            numberofTopics: cdk.Token.asString(_numberOfTopics.value),
            topicSchedule: _topicSchedule.valueAsString,
            s3LoggingBucket: s3AccessLoggingBucket
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
