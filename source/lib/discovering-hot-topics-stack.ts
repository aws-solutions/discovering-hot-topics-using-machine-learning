#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICNSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/


import { Stack, Construct, StackProps, CfnParameter } from '@aws-cdk/core';
import { TextOrchestration } from './text-analysis-workflow/text-orchestration-construct';
import { AppIntegration } from './integration/app-integration-construct';
import { InferenceDatabase } from './visualization/inf-database-construct';
import { Ingestion } from './ingestion/ingestion-construct';
import { TopicOrchestration } from './topic-analysis-workflow/topic-orchestration-construct';
import { SolutionHelper } from './solution-helper/solution-helper-construct';

export interface DiscoveringHotTopicsStackProps extends StackProps {
    readonly solutionID: string
}
export class DiscoveringHotTopicsStack extends Stack {
    constructor(scope: Construct, id: string, props: DiscoveringHotTopicsStackProps) {
        super(scope, id, props);

        //TODO - add cron as part of the input text field
        const ingestFreqParam = new CfnParameter(this, 'IngestQueryFrequency', {
            type: 'String',
            default: 'cron(0/2 * * * ? *)',
            description: 'The frequency at which API calls will be made to twitter in a cron expression format. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: 'cron(\\S+\\s){5}\\S+' //TODO - look for a better validation pattern
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
            allowedPattern: '([a-z]{2}-[a-z]{2}|[a-z]{2})(,([a-z]{2}-[a-z]{2}|[a-z]{2}))*'
        });

        //TODO - add cron as part of the input text field
        const topicSchedule = new CfnParameter(this, 'TopicAnalysisFrequency', {
            type: 'String',
            default: 'cron(5 */2 * * ? *)',
            allowedPattern: 'cron(\\S+\\s){5}\\S+',
            description: 'The frequency at which the topic analysis job should run. The minimum is an hour. It is recommened That the job be run a few mins after the hour e.g 5 mins after the hour'
        });

        const numberOfTopics = new CfnParameter(this, 'NumberOfTopics', {
            type: 'String',
            default: '10',
            allowedPattern: '^[1-9][0-9]?$|^100$',
            // minValue: 1, //TODO - CDK issue with valueAsNumber. Hence using string for now
            // maxValue: 100,
            minLength: 1,
            maxLength: 3,
            description: 'The number of topics to be discovered by Topic analysis. The min value is 1 and maximum value is 100'
        });

        const credentialKeyPath = new CfnParameter(this, 'SSMPathForCredentials', {
            type: 'String',
            default: '/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter',
            description: 'The SSM parameter store path of key where the credentials are stored as encrypted string',
        });

        new SolutionHelper(this, 'SolutionHelper', { solutionId: props.solutionID });

        const storageCofig = {
            Sentiment: 'sentiment/',
            Entity: 'entity/',
            KeyPhrase: 'keyphrase/',
            Topics: 'topics/',
            TopicMappings: 'topic-mappings/',
            TxtInImgEntity: 'txtinimgentity/',
            TxtInImgSentiment: 'txtinimgsentiment/',
            TxtInImgKeyPhrase: 'txtinimgkeyphrase/',
            ModerationLabels: 'moderationlabels/'
        }

        // start of workflow -> storage integration
        const textInferenceNameSpace = 'com.analyze.text.inference';
        const topicsAnalysisInfNameSpace = 'com.analyze.topic.inference.topics';
        const topicMappingsInfNameSpace = 'com.analyze.topic.inference.mappings';
        const appIntegration = new AppIntegration(this, 'InfOutput', {
            textAnalysisInfNS: textInferenceNameSpace,
            topicsAnalysisInfNS: topicsAnalysisInfNameSpace,
            topicMappingsInfNS: topicMappingsInfNameSpace,
            tableMappings: storageCofig
        });
        // start of workflow -> storage integration

        // start of storage and visualization
        new InferenceDatabase(this, 'InfDB', {
            s3InputDataBucket: appIntegration.s3Bucket,
            tableMappings: storageCofig
        });
        // end of storage and visualization

        // start creation of step functions state machine and event bus
        const textWorkflowEngine = new TextOrchestration(this, 'TextWfEngine', {
            eventBus: appIntegration.eventManager.eventBus,
            textAnalysisNameSpace: textInferenceNameSpace,
        });

        const topicWorkflowEngine = new TopicOrchestration(this, 'TopicWFEngine', {
            topicsAnalaysisNameSpace: topicsAnalysisInfNameSpace,
            topicMappingsNameSpace: topicMappingsInfNameSpace,
            eventBus: appIntegration.eventManager.eventBus,
            rawBucket: textWorkflowEngine.s3Bucket,
            ingestionWindow: '2', // number of days
            numberofTopics: numberOfTopics.valueAsString,
            topicSchedule: topicSchedule.valueAsString,
            stackName: this.stackName
        });
        // end creation of step functions state machine and event bus

        // start creation of Kinesis consumer that invokes state machine
        new Ingestion(this, 'Ingestion', {
            stateMachineArn: textWorkflowEngine.stateMachine.stateMachineArn,
            solutionName: 'discovering-hot-topics-using-machine-learning',
            stackName: this.stackName,
            ingestFrequency: ingestFreqParam.valueAsString,
            queryParameter: queryParam.valueAsString,
            supportedLang: supportedLang.valueAsString,
            credentialKeyPath : credentialKeyPath.valueAsString
        })
        // end creation of Lambda Kinesis producer that fetches social media feed
    }
}
