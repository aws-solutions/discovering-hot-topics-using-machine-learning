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

import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { PlatformType } from '../ingestion/platform-type';
import { EventStorage } from '../storage/event-storage-construct';
import { updateBucketResourcePolicy } from '../utils/policy';
import { StepFuncCallbackTask } from './callback-task-construct';
import { StepFuncLambdaTask } from './lambda-task-construct';
import { Workflow } from './workflow-construct';

export interface TextOrchestrationProps {
    readonly eventBus: events.IEventBus;
    readonly textAnalysisNameSpace: string;
    readonly s3LoggingBucket: s3.IBucket;
    readonly lambdaTriggerFunc: lambda.IFunction;
    readonly platformTypes: PlatformType[];
}

export class TextOrchestration extends Construct {
    private readonly _stateMachine: sfn.StateMachine;
    private _s3Bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: TextOrchestrationProps) {
        super(scope, id);

        this._s3Bucket = defaults.buildS3Bucket(this, {
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}/`
            }
        }).bucket;

        updateBucketResourcePolicy(props.s3LoggingBucket as s3.Bucket, this._s3Bucket, id);

        const s3Storage: { [index: string]: EventStorage } = {};
        for (const sourcetype of props.platformTypes) {
            if (sourcetype.topicModelling) {
                s3Storage[sourcetype.name] = new EventStorage(this, `${sourcetype.name}RawForTA`, {
                    compressionFormat: 'UNCOMPRESSED',
                    s3Bucket: this._s3Bucket,
                    prefix: `${sourcetype.name.toLowerCase()}/`
                });
            }
        }

        // start of detect language task
        const detectLangTask = new StepFuncCallbackTask(this, 'DetectLang', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-detect-language'),
                reservedConcurrentExecutions: 15,
                environment: {
                    DEFAULT_LANGAUGE: 'en'
                }
            },
            ...this.getDefaultQueueProps(),
            ...this.getDefaultSqsEventSourceProps()
        });

        const lambdaDetectLangPolicy = new iam.Policy(this, 'LambdaDetectLangPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'], // AWS Comprehend endpoints dont have an ARN. Hence '*'
                    actions: ['comprehend:DetectDominantLanguage']
                })
            ]
        });

        lambdaDetectLangPolicy.attachToRole(detectLangTask.lambda.role!);

        (lambdaDetectLangPolicy.node.defaultChild as iam.CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W12',
                        reason: `The * resource allows lambda function to access Amazon Comprehend services.
                        The comprehend services not have a resource arn. This permission is retricted to
                        the lambda function responsible for accessing the Amazon Comprehend service`
                    }
                ]
            }
        };
        // end of detect language task

        // start of embedded text detection
        const lambdaPublishEventPolicy = new iam.Policy(this, 'LambdaEventBusPolicy');
        lambdaPublishEventPolicy.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [props.eventBus.eventBusArn],
                actions: ['events:PutEvents']
            })
        );

        const imageAnalysisTask = new StepFuncCallbackTask(this, 'ImageAnalysis', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-extract-text-in-image'),
                timeout: cdk.Duration.minutes(15),
                reservedConcurrentExecutions: 15
            },
            ...this.getDefaultQueueProps(),
            ...this.getDefaultSqsEventSourceProps()
        });

        const imageBucketLambda = new LambdaToS3(this, 'ImageBucket', {
            existingLambdaObj: imageAnalysisTask.lambda,
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}/`
            }
        });

        updateBucketResourcePolicy(props.s3LoggingBucket as s3.Bucket, imageBucketLambda.s3Bucket!, id);

        imageBucketLambda.s3Bucket!.addToResourcePolicy(
            new iam.PolicyStatement({
                resources: [`${imageBucketLambda.s3Bucket!.bucketArn}`, `${imageBucketLambda.s3Bucket!.bucketArn}/*`],
                actions: ['s3:List*', 's3:Get*'],
                principals: [new iam.ServicePrincipal('rekognition.amazonaws.com')],
                effect: iam.Effect.ALLOW
            })
        );

        const detectTextLambdaPolicy = new iam.Policy(this, 'TextRekAnalyze', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['rekognition:detectText']
                })
            ]
        });
        const analyzeImageLambdaRole = imageBucketLambda.lambdaFunction.role as iam.Role;
        detectTextLambdaPolicy.attachToRole(analyzeImageLambdaRole);

        (detectTextLambdaPolicy.node.defaultChild as iam.CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W12',
                        reason: `The * resource allows lambda function to access Amazon Rekognition services. The Rekognition services do not have a resource arn.
                        This permission is retricted to the lambda function responsible for accessing the Amazon Rekognition service`
                    }
                ]
            }
        };
        // end of embedded text

        // start of content moderation
        const moderationLabelTask = new StepFuncCallbackTask(this, 'ModerationLabels', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-detect-moderation-labels'),
                timeout: cdk.Duration.minutes(5),
                environment: {
                    S3_BUCKET_NAME: imageBucketLambda.s3Bucket!.bucketName
                },
                reservedConcurrentExecutions: 15
            },
            ...this.getDefaultQueueProps(),
            ...this.getDefaultSqsEventSourceProps(),
            sqsSendMessageProps: {
                outputPath: '$.moderation_labels_in_imgs'
            }
        });
        imageBucketLambda.s3Bucket!.grantReadWrite(moderationLabelTask.lambda);

        const detectModerationLambdaPolicy = new iam.Policy(this, 'LabelsRekAnalyze', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: ['*'],
                    actions: ['rekognition:detectModerationLabels']
                })
            ]
        });

        const moderationLabelRole = moderationLabelTask.lambda.role as iam.Role;
        detectModerationLambdaPolicy.attachToRole(moderationLabelRole);

        (detectModerationLambdaPolicy.node.defaultChild as iam.CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W12',
                        reason: `The * resource allows lambda function to access Amazon Rekognition services. The Rekognition services do not have a resource arn.
                        This permission is retricted to the lambda function responsible for accessing the Amazon Rekognition service`
                    }
                ]
            }
        };
        // end of content moderation

        // start of translation task state lambda function and role iam.Policy
        const translateTask = new StepFuncCallbackTask(this, 'Translate', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-translate-text'),
                timeout: cdk.Duration.minutes(5),
                reservedConcurrentExecutions: 7 //translate has a lower service TPS quota as compared to other services
            },
            ...this.getDefaultQueueProps(600),
            ...this.getDefaultSqsEventSourceProps()
        });

        for (const key of Object.keys(s3Storage)) {
            translateTask.lambda.addEnvironment(`KINESIS_FIREHOSE_FOR_${key}`, s3Storage[key].deliveryStreamName);
        }

        const lambdaTranslatePolicy = new iam.Policy(this, 'TranslateLambda', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [`*`],
                    actions: ['translate:translateText']
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: Object.keys(s3Storage).map((key) => s3Storage[key].kinesisFirehose.attrArn),
                    actions: ['firehose:PutRecord', 'firehose:PutRecordBatch']
                })
            ]
        });

        const cfnTranslatePolicy = lambdaTranslatePolicy.node.defaultChild as iam.CfnPolicy;
        cfnTranslatePolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W12',
                        reason: `The * resource allows lambda function to access Amazon Translate services. The translate services do not have a resource arn.
                        This permission is retricted to the lambda function responsible for accessing the Amazon Translate service`
                    }
                ]
            }
        };

        lambdaTranslatePolicy.attachToRole(translateTask.lambda.role as iam.Role);
        // end of translation task state lambda function and role iam.Policy

        // start of text analysis task state lambda function and role iam.Policy
        const textAnalysisTask = new StepFuncCallbackTask(this, 'TextAnalysis', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-analyze-text'),
                timeout: cdk.Duration.minutes(5),
                reservedConcurrentExecutions: 15
            },
            ...this.getDefaultQueueProps(),
            ...this.getDefaultSqsEventSourceProps()
        });

        const lambdaComprehendPolicy = new iam.Policy(this, 'LambdaComprehendPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    resources: [`*`],
                    actions: ['comprehend:DetectSentiment', 'comprehend:DetectEntities', 'comprehend:DetectKeyPhrases']
                })
            ]
        });

        lambdaComprehendPolicy.attachToRole(textAnalysisTask.lambda.role as iam.Role);

        const cfnPolicy = lambdaComprehendPolicy.node.defaultChild as iam.CfnPolicy;
        cfnPolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [
                    {
                        id: 'W12',
                        reason: `The * resource allows lambda function to access Amazon Comprehend services.
                    The comprehend services not have a resource arn. This permission is retricted to
                    the lambda function responsible for accessing the Amazon Comprehend service`
                    }
                ]
            }
        };
        // end of text analysis task state lambda function and role iam.Policy

        // start of publish event task state lambda function and role iam.Policy
        // This task does not use the callback pattern with SQS because base it is only publishing to an event bus which
        // should be able to handle high TPS
        const publishEventsTask = new StepFuncLambdaTask(this, 'PublishEvents', {
            taskName: 'PublishEvents',
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset('lambda/wf-publish-text-inference'),
                timeout: cdk.Duration.minutes(5),
                environment: {
                    EVENT_BUS_NAME: props.eventBus.eventBusName,
                    EVENT_NAMESPACE: props.textAnalysisNameSpace
                },
                memorySize: 256
            }
        });

        lambdaPublishEventPolicy.attachToRole(publishEventsTask.lambdaFunction.role as iam.Role);
        // end of publish event task state lambda function and role iam.Policy

        // start of creating workflow
        const parallel = new sfn.Parallel(this, 'TextImageSplitProcess', {
            comment: 'Parallely process Text and Image',
            inputPath: '$',
            outputPath: '$'
        });

        const textAnalysisChain = sfn.Chain.start(translateTask).next(textAnalysisTask);

        parallel.branch(moderationLabelTask, textAnalysisChain);

        const isLangAvailable = new sfn.Choice(this, 'LanguageAvailable?', {
            comment: 'Check if the language is available',
            inputPath: '$'
        });

        isLangAvailable.when(sfn.Condition.isNotPresent('$.feed.lang'), detectLangTask);
        isLangAvailable.when(sfn.Condition.stringEquals('$.feed.lang', 'und'), detectLangTask);
        isLangAvailable.when(sfn.Condition.stringEquals('$.feed.lang', 'None'), detectLangTask);
        isLangAvailable.otherwise(imageAnalysisTask);
        detectLangTask.next(imageAnalysisTask);
        imageAnalysisTask
            .next(parallel)
            .next(
                new sfn.Pass(this, 'MergeJson', {
                    parameters: {
                        'account_name.$': '$[1].account_name',
                        'platform.$': '$[1].platform',
                        'search_query.$': '$[1].search_query',
                        'feed.$': '$[1].feed',
                        'Sentiment.$': '$[1].Sentiment',
                        'SentimentScore.$': '$[1].SentimentScore',
                        'KeyPhrases.$': '$[1].KeyPhrases',
                        'Entities.$': '$[1].Entities',
                        'moderation_labels_in_imgs.$': '$[0]',
                        'text_in_images.$': '$[1].text_in_images'
                    }
                })
            )
            .next(publishEventsTask.stepFunctionTask)
            .next(new sfn.Succeed(this, 'Success'));

        // end of creating workflow

        const workflowChain = sfn.Chain.start(isLangAvailable);
        this._stateMachine = new Workflow(this, 'StateMachine', {
            chain: workflowChain,
            lambdaFunc: props.lambdaTriggerFunc
        }).stateMachine;

        (
            this._stateMachine.role.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as iam.CfnPolicy
        ).addMetadata('cfn_nag', {
            rules_to_suppress: [
                {
                    id: 'W76',
                    reason:
                        'The statemachine invokes multiple lambdas and the policy is narrowed down to the specific lambda resource arn. ' +
                        'Hence it has multiple policy statements resulting in a higher SPCM value'
                },
                {
                    id: 'W12',
                    reason: 'The "LogDelivery" actions do not support resource-level authorization'
                }
            ]
        });
    }

    /**
     * Method to provide queue props timeout duration specifically. The input parameter @timeoutMinutes is optional. If not provided, it
     * defaults to 60 mins.
     *
     */
    private getDefaultQueueProps(timeoutMinutues?: number) {
        const timeout = timeoutMinutues ? timeoutMinutues : 60;
        return {
            queueProps: {
                visibilityTimeout: cdk.Duration.minutes(timeout)
            } as Partial<sqs.QueueProps>
        };
    }

    private getDefaultSqsEventSourceProps() {
        // the default implementation does not set the maxBatchingWindow size, since we want some of the inferences to be delivered in
        // near real-time, which implies that the lambda be invoked as soon as the message is in the queue.
        return {
            sqsEventSourceProps: {
                enabled: true,
                batchSize: 1 // setting batch size as 1 to ensure that the AI services do not get throttled with multiple requests.
            } as sources.SqsEventSourceProps
        };
    }

    public get stateMachine(): sfn.StateMachine {
        return this._stateMachine;
    }

    public get s3Bucket(): s3.Bucket {
        return this._s3Bucket;
    }
}
