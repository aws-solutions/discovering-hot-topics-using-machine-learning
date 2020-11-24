#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/


import { AnyPrincipal, Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Key } from '@aws-cdk/aws-kms';
import { BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption, CfnBucket } from '@aws-cdk/aws-s3';
import { Aws, CfnOutput, CfnParameter, Construct, RemovalPolicy, Stack, StackProps, Token } from '@aws-cdk/core';
import { Ingestion } from './ingestion/ingestion-construct';
import { AppIntegration } from './integration/app-integration-construct';
import { QuickSightStack } from './quicksight-custom-resources/quicksight-stack';
import { SolutionHelper } from './solution-helper/solution-helper-construct';
import { TextOrchestration } from './text-analysis-workflow/text-orchestration-construct';
import { TopicOrchestration } from './topic-analysis-workflow/topic-orchestration-construct';

export interface DiscoveringHotTopicsStackProps extends StackProps {
    readonly solutionID: string,
    readonly solutionName: string
}

export class DiscoveringHotTopicsStack extends Stack {
    constructor(scope: Construct, id: string, props: DiscoveringHotTopicsStackProps) {
        super(scope, id, props);

        const ingestFreqParam = new CfnParameter(this, 'IngestQueryFrequency', {
            type: 'String',
            default: 'cron(0/5 * * * ? *)',
            description: 'The frequency at which API calls will be made to twitter in a cron expression format. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: 'cron(\\S+\\s){5}\\S+', //TODO - look for a better validation pattern
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(0/5 * * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const queryParam = new CfnParameter(this, 'QueryParameter', {
            type: 'String',
            description: 'The query you would like to execute on twitter. For details of how write a query and use operators, please go to https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators',
            minLength: 3,
            maxLength: 500,
            default:'health'
        });

        const supportedLang = new CfnParameter(this, 'SupportedLanguages', {
            default: 'de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw',
            description: 'The list of languages to support. The super set of languages supported is driven by Amazon Translate. For an latest list of languages, please refer to the Comprehend documentation at this location https://docs.aws.amazon.com/translate/latest/dg/what-is.html#language-pairs',
            maxLength: 43,
            minLength: 2,
            allowedPattern: '([a-z]{2}-[a-z]{2}|[a-z]{2})(,([a-z]{2}-[a-z]{2}|[a-z]{2}))*',
            constraintDescription: 'Provide a list of comma separated language iso-code values e.g. de,en,es,it,pt,fr,ja,ko,hi,ar,zh-cn,zh-tw (no spaces after the comma). The input did not match the validation pattern.'
        });

        const topicSchedule = new CfnParameter(this, 'TopicAnalysisFrequency', {
            type: 'String',
            default: 'cron(5 0 * * ? *)',
            allowedPattern: 'cron(\\S+\\s){5}\\S+',
            description: 'The frequency at which the topic analysis job should run. The minimum is an hour. It is recommened That the job be run a few mins after the hour e.g 10 mins after the hour',
            constraintDescription: 'Please provide a valid cron expression of the format \'cron(5 0 * * ? *)\'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html'
        });

        const numberOfTopics = new CfnParameter(this, 'NumberOfTopics', {
            type: 'Number',
            default: '10',
            minValue: 1,
            maxValue: 100,
            description: 'The number of topics to be discovered by Topic analysis. The min value is 1 and maximum value is 100',
            constraintDescription: 'Please verify if the value entered for number of topics to be discovered is between 1 and 100 (both inclusive).'
        });

        const credentialKeyPath = new CfnParameter(this, 'SSMPathForCredentials', {
            type: 'String',
            default: '/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter',
            allowedPattern: '^(?!\\s*$).+',
            description: 'The SSM parameter store path of key where the credentials are stored as encrypted string',
            constraintDescription: 'The SSM parameter store path cannot be empty'
        });

        const quickSightPrincipalArn = new CfnParameter(this, 'QuickSightPrincipalArn', {
            type: 'String',
            description: 'The Amazon QuickSight principal arn used in the permissions of QuickSight resources',
            allowedPattern: '^arn:\\S+:quicksight:\\S+:\\d{12}:user/\\S+$',
            constraintDescription: 'Provide an arn matching an Amazon Quicksight User ARN. The input did not match the validation pattern.'
        });

        new SolutionHelper(this, 'SolutionHelper', { solutionId: props.solutionID, searchQuery: queryParam.valueAsString, langFilter: supportedLang.valueAsString });

        const glueKMSKey = new Key(this, 'GlueCatalogKMSKey', {
            enableKeyRotation: true
        });

        const s3AccessLoggingBucket = new Bucket(this, 'AccessLog', {
            versioned: false,
            encryption: BucketEncryption.S3_MANAGED,
            accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.RETAIN
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

        (s3AccessLoggingBucket.node.defaultChild as CfnBucket).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: 'This S3 bucket is used as the access logging bucket for another bucket'
                }]
            }
        };

        const qsNestedTemplate = new QuickSightStack(this, 'QSDashboard', {
            parameters: {
                "QuickSightSourceTemplateArn": this.node.tryGetContext('quicksight_source_template_arn'),
                "QuickSightPrincipalArn": quickSightPrincipalArn.valueAsString,
                "S3AccessLogBucket": s3AccessLoggingBucket.bucketArn,
                "SolutionID": props.solutionID,
                "SolutionName": props.solutionName,
                "ParentStackName": Aws.STACK_NAME
            }
        });
        qsNestedTemplate.nestedStackResource?.addMetadata('nestedStackFileName', qsNestedTemplate.templateFile.slice(0, -5));

        const storageCofig: Map<string, string> = new Map();
        storageCofig.set('Sentiment', 'sentiment');
        storageCofig.set('Entity', 'entity');
        storageCofig.set('KeyPhrase', 'keyphrase');
        storageCofig.set('Topics', 'topics');
        storageCofig.set('TopicMappings', 'topicmappings');
        storageCofig.set('TxtInImgEntity', 'txtinimgentity');
        storageCofig.set('TxtInImgSentiment', 'txtinimgsentiment');
        storageCofig.set('TxtInImgKeyPhrase', 'txtinimgkeyphrase');
        storageCofig.set('ModerationLabels', 'moderationlabels');

        // start of workflow -> storage integration
        const textInferenceNameSpace = 'com.analyze.text.inference';
        const topicsAnalysisInfNameSpace = 'com.analyze.topic.inference.topics';
        const topicMappingsInfNameSpace = 'com.analyze.topic.inference.mappings';
        const appIntegration = new AppIntegration(this, 'InfOutput', {
            textAnalysisInfNS: textInferenceNameSpace,
            topicsAnalysisInfNS: topicsAnalysisInfNameSpace,
            topicMappingsInfNS: topicMappingsInfNameSpace,
            tableMappings: storageCofig,
            glueKMSKey: glueKMSKey,
            s3LoggingBucket: s3AccessLoggingBucket
        });
        appIntegration.node.addDependency(qsNestedTemplate);
        // start of workflow -> storage integration

        // start creation of Kinesis consumer that invokes state machine
        const ingestionConstruct = new Ingestion(this, 'Ingestion', {
            solutionName: props.solutionName,
            ingestFrequency: ingestFreqParam.valueAsString,
            queryParameter: queryParam.valueAsString,
            supportedLang: supportedLang.valueAsString,
            credentialKeyPath : credentialKeyPath.valueAsString
        });
        ingestionConstruct.node.addDependency(qsNestedTemplate);
        // end creation of Lambda Kinesis producer that fetches social media feed

        // start creation of step functions state machine and event bus
        const textWorkflowEngine = new TextOrchestration(this, 'TextWfEngine', {
            eventBus: appIntegration.eventManager.eventBus,
            textAnalysisNameSpace: textInferenceNameSpace,
            s3LoggingBucket: s3AccessLoggingBucket,
            lambdaTriggerFunc: ingestionConstruct.consumerLambdaFunc
        });
        textWorkflowEngine.node.addDependency(qsNestedTemplate);

        const topicWorkflowEngine = new TopicOrchestration(this, 'TopicWFEngine', {
            topicsAnalaysisNameSpace: topicsAnalysisInfNameSpace,
            topicMappingsNameSpace: topicMappingsInfNameSpace,
            eventBus: appIntegration.eventManager.eventBus,
            rawBucket: textWorkflowEngine.s3Bucket,
            ingestionWindow: '2', // number of days
            numberofTopics: Token.asString(numberOfTopics.value),
            topicSchedule: topicSchedule.valueAsString,
            s3LoggingBucket: s3AccessLoggingBucket
        });

        topicWorkflowEngine.node.addDependency(qsNestedTemplate);
        // end creation of step functions state machine and event bus

        new CfnOutput(this, 'QSAnalysisURL', {
            value: qsNestedTemplate.analysisURLOutput,
            description: 'Amazon QuickSight URL for analysis',
        });

        new CfnOutput(this, 'QSDashboardURL', {
            value: qsNestedTemplate.dashboardURLOutput,
            description: 'Amazon QuickSight URL for dashboard',
        });
    }
}