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

import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { DiscoveringHotTopicsStack } from '../discovering-hot-topics-stack';
import { FeedProducer } from './feed-producer-construct';

export interface TwitterSearchIngestionProps {
    readonly ingestFrequency: string;
    readonly queryParameter: string;
    readonly supportedLang: string; //comma separated values of language codes
    readonly credentialKeyPath: string;
}

export class TwitterSearchIngestion extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        const solutionName = this.node.tryGetContext('solution_name');

        const _supportedLang = new cdk.CfnParameter(this, 'SupportedLang', {
            type: 'String',
            description:
                'The list of languages to query the Search API with. The super set of languages supported is driven by Amazon Translate.' +
                'For an latest list of languages, please refer to the Amazon Translate documentation https://docs.aws.amazon.com/translate/latest/dg/what-is.html#language-pairs',
            maxLength: 43,
            minLength: 2,
            allowedPattern: '^$|([a-z]{2}-[a-z]{2}|[a-z]{2})(,([a-z]{2}-[a-z]{2}|[a-z]{2}))*',
            constraintDescription:
                'Provide a list of comma separated language iso-code values, Example: de,en,es,it,pt,fr,ja,ko,zh-cn (no spaces after the comma). The input did not match the validation pattern.'
        });

        const _queryParam = new cdk.CfnParameter(this, 'QueryParameter', {
            type: 'String',
            description:
                'The query you would like to execute on twitter. For details of how write a query and use operators, please go to https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators',
            minLength: 3,
            maxLength: 500,
            default: 'entertainment'
        });

        const _credentialKeyPathParam = new cdk.CfnParameter(this, 'SSMPathForCredentials', {
            type: 'String',
            default:
                '/discovering-hot-topics-using-machine-learning/discovering-hot-topics-using-machine-learning/twitter',
            allowedPattern: '^(?!\\s*$).+',
            description: 'The SSM parameter store path of key where the credentials are stored as encrypted string',
            constraintDescription: 'The SSM parameter store path cannot be empty'
        });

        const _ingestFreqParam = new cdk.CfnParameter(this, 'IngestQueryFrequency', {
            type: 'String',
            default: 'cron(0/5 * * * ? *)',
            description:
                'The frequency at which API calls will be made to twitter in a cron expression format. For detailed documentation on schedule expression rules, please refer https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html',
            allowedPattern: DiscoveringHotTopicsStack.cronRegex,
            constraintDescription:
                "Please provide a valid cron expression of the format 'cron(0/5 * * * ? *)'. For details on CloudWatch cron expressions, please refer the following link https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html"
        });

        const _streamArn = new cdk.CfnParameter(this, 'StreamARN', {
            type: 'String',
            description: 'The name of the stream where search comments should be published for analysis',
            allowedPattern: '^arn:\\S+:kinesis:\\S+:\\d{12}:stream/\\S+$',
            constraintDescription: 'Please provide the Amazon Kinesis Data Streams name'
        });

        const _stream = kinesis.Stream.fromStreamArn(this, 'PublishCommentsStream', _streamArn.valueAsString);
        const _credentialPath = _credentialKeyPathParam.valueAsString
            ? _credentialKeyPathParam.valueAsString
            : `${this.node.tryGetContext('solution_name')}/${cdk.Aws.STACK_NAME}/twitter`;

        new FeedProducer(this, 'TwitterSearchAPI', {
            functionProps: {
                timeout: cdk.Duration.minutes(10),
                runtime: lambda.Runtime.NODEJS_18_X,
                code: lambda.Code.fromAsset('lambda/ingestion-producer'),
                handler: 'index.handler',
                environment: {
                    STREAM_NAME: _stream.streamName,
                    SOLUTION_NAME: solutionName,
                    STACK_NAME: cdk.Aws.STACK_NAME,
                    SUPPORTED_LANG: _supportedLang.valueAsString,
                    QUERY_PARAM: _queryParam.valueAsString,
                    CAP_NUM_RECORD: '25',
                    QUERY_RESULT_TYPE: 'mixed', //options are mixed, recent or popular
                    TWEET_MODE: 'extended',
                    TWITTER_CREDENTIAL_KEY_PATH: _credentialPath
                },
                reservedConcurrentExecutions: 1, // adding to throttle executions of this lambda function
                memorySize: 512
            },
            stream: _stream,
            ingestFrequency: _ingestFreqParam.valueAsString,
            credentialKeyPath: _credentialPath
        });
    }
}
