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

import { EventBus } from '@aws-cdk/aws-events';
import { CfnPolicy, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { Chain, Parallel, Pass, StateMachine, Succeed } from '@aws-cdk/aws-stepfunctions';
import { Construct, Duration } from '@aws-cdk/core';
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import { buildS3Bucket } from '@aws-solutions-constructs/core';
import { EventStorage } from '../storage/event-storage-construct';
import { StepFuncLambdaTask } from './lambda-task-construct';
import { Workflow } from './workflow-construct';

export interface TextOrchestrationProps {
    readonly eventBus: EventBus
    readonly textAnalysisNameSpace: string,
    readonly s3LoggingBucket: Bucket,
    readonly lambdaTriggerFunc: Function
}

export class TextOrchestration extends Construct {
    private readonly _stateMachine: StateMachine;
    private eventStorage: EventStorage;
    private _s3Bucket: Bucket;

    constructor (scope: Construct, id: string, props: TextOrchestrationProps) {
        super(scope, id);

        [ this._s3Bucket ] = buildS3Bucket(this, {
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}/`
            }
        });

        this.eventStorage = new EventStorage(this, 'RawForTA', {
            compressionFormat: 'UNCOMPRESSED',
            s3Bucket: this._s3Bucket
        });

        // start of embedded text detection
        const lambdaPublishEventPolicy = new Policy(this, 'LambdaEventBusPolicy');
        lambdaPublishEventPolicy.addStatements(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [ props.eventBus.eventBusArn ],
            actions: [ 'events:PutEvents' ],
        }));

        const imageAnalysisTask = new StepFuncLambdaTask(this, 'ImageAnalysis', {
            taskName: 'AnalyzeImage',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-extract-text-in-image`),
                timeout: Duration.minutes(10)
            }
        });

        const imageBucketLambda = new LambdaToS3(this, 'ImageBucket', {
            existingLambdaObj: imageAnalysisTask.lambdaFunction,
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}/`
            }
        });

        imageBucketLambda.s3Bucket!.addToResourcePolicy(new PolicyStatement({
            resources: [ `${imageBucketLambda.s3Bucket!.bucketArn}`, `${imageBucketLambda.s3Bucket!.bucketArn}/*` ],
            actions: [ 's3:List*', 's3:Get*' ],
            principals: [ new ServicePrincipal('rekognition.amazonaws.com') ],
            effect: Effect.ALLOW
        }));

        const detectTextLambdaPolicy = new Policy(this, 'TextRekAnalyze', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ '*' ],
                    actions: [ 'rekognition:detectText' ]
                })
            ]
        });
        const analyzeImageLambdaRole = imageBucketLambda.lambdaFunction.role as Role
        detectTextLambdaPolicy.attachToRole(analyzeImageLambdaRole);

        (detectTextLambdaPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Rekognition services. The Rekognition services do not have a resource arn.
                  This permission is retricted to the lambda function responsible for accessing the Amazon Rekognition service`
                }]
            }
        };
        // end of embedded text

        // start of content moderation
        const moderationLabelTask = new StepFuncLambdaTask(this, 'ModerationLabels', {
            taskName: 'DetectModerationLabels',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-detect-moderation-labels`),
                timeout: Duration.minutes(5),
                environment: {
                    S3_BUCKET_NAME: imageBucketLambda.s3Bucket!.bucketName
                }
            }
        });
        imageBucketLambda.s3Bucket!.grantReadWrite(moderationLabelTask.lambdaFunction);

        const detectModerationLambdaPolicy = new Policy(this, 'LabelsRekAnalyze', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ '*' ],
                    actions: [ 'rekognition:detectModerationLabels' ]
                })
            ]
        });

        const moderationLabelRole = moderationLabelTask.lambdaFunction.role as Role;
        detectModerationLambdaPolicy.attachToRole(moderationLabelRole);

        (detectModerationLambdaPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Rekognition services. The Rekognition services do not have a resource arn.
                  This permission is retricted to the lambda function responsible for accessing the Amazon Rekognition service`
                }]
            }
        };
        // end of content moderation

        // start of translation task state lambda function and role policy
        const translateTask = new StepFuncLambdaTask(this, 'Translate', {
            taskName: 'Translate',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-translate-text`),
                timeout: Duration.minutes(5),
                environment: {
                    KINESIS_FIREHOSE_NAME: this.eventStorage.deliveryStreamName
                }
            }
        });

        const lambdaTranslatePolicy = new Policy(this, 'TranslateLambda', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ `*` ],
                    actions: [ 'translate:translateText' ]
            }), new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [ `${this.eventStorage.kinesisFirehose.attrArn}` ],
                actions: [ "firehose:PutRecord", "firehose:PutRecordBatch" ]
            })]
        });

        const cfnTranslatePolicy = lambdaTranslatePolicy.node.defaultChild as CfnPolicy;
        cfnTranslatePolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Translate services. The translate services do not have a resource arn.
                  This permission is retricted to the lambda function responsible for accessing the Amazon Translate service`
                }]
            }
        };

        lambdaTranslatePolicy.attachToRole(translateTask.lambdaFunction.role as Role);
        // end of translation task state lambda function and role policy

        // start of text analysis task state lambda function and role policy
        const textAnalysisTask = new StepFuncLambdaTask(this, 'TextAnalysis', {
            taskName: 'AnalyzeText',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-analyze-text`),
                timeout: Duration.minutes(5)
            }
        });

        const lambdaComprehendPolicy = new Policy(this, 'LambdaComprehendPolicy', {
            statements: [ new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [ `*` ],
                actions: [ 'comprehend:DetectSentiment', 'comprehend:DetectEntities', 'comprehend:DetectKeyPhrases' ]
            })]
        });

        lambdaComprehendPolicy.attachToRole(textAnalysisTask.lambdaFunction.role as Role);

        const cfnPolicy = lambdaComprehendPolicy.node.defaultChild as CfnPolicy;
        cfnPolicy.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Comprehend services.
                  The comprehend services not have a resource arn. This permission is retricted to
                   the lambda function responsible for accessing the Amazon Comprehend service`
                }]
            }
        };
        // end of text analysis task state lambda function and role policy

        // start of publish event task state lambda function and role policy
        const publishEventsTask = new StepFuncLambdaTask(this, 'PublishEvents', {
            taskName: 'PublishEvent',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-publish-text-inference`),
                timeout: Duration.minutes(5),
                environment: {
                    EVENT_BUS_NAME: props.eventBus.eventBusName,
                    EVENT_NAMESPACE: props.textAnalysisNameSpace
                },
                memorySize: 256
            }
        });

        lambdaPublishEventPolicy.attachToRole(publishEventsTask.lambdaFunction.role as Role);
        // end of publish event task state lambda function and role policy

        // start of creating workflow
        const parallel = new Parallel(this, 'TextImageSplitProcess', {
            comment: 'Parallely process Text and Image',
            inputPath: '$',
            outputPath: '$'
        });

        const textAnalysisChain = Chain.start(translateTask.stepFunctionTask)
                                        .next(textAnalysisTask.stepFunctionTask)

        parallel.branch(moderationLabelTask.stepFunctionTask,textAnalysisChain);

        const workflowChain = Chain.start(imageAnalysisTask.stepFunctionTask)
                             .next(parallel)
                             .next(new Pass(this, 'MergeJson', {
                                parameters: {
                                    'account_name.$': '$[1].account_name',
                                    'platform.$': '$[1].platform',
                                    'search_query.$': '$[1].search_query',
                                    'feed.$': '$[1].feed',
                                    'Sentiment.$': '$[1].Sentiment',
                                    'SentimentScore.$': '$[1].SentimentScore',
                                    'KeyPhrases.$': '$[1].KeyPhrases',
                                    'Entities.$': '$[1].Entities',
                                    'moderation_labels_in_imgs.$' : '$[0].moderation_labels_in_imgs',
                                    'text_in_images.$': '$[1].text_in_images'
                                }
                             }))
                             .next(publishEventsTask.stepFunctionTask)
                             .next(new Succeed(this, 'Success'));
        // end of creating workflow

        this._stateMachine = new Workflow(this, 'StateMachine', {
            chain: workflowChain,
            lambdaFunc: props.lambdaTriggerFunc
        }).stateMachine;

        // const stateMachinePolicy = this._stateMachine.node.findChild('StateMachine').node.findChild('WorkflowEngine').node.findChild('StateMachine').node.findChild('Role').node.findChild('DefaultPolicy') as CfnPolicy;
        // stateMachinePolicy.cfnOptions.metadata = {
        //     cfn_nag: {
        //         rules_to_suppress: [{
        //           id: 'W76',
        //           reason: `The statemachine policy is to allow different lambda function tasks to be invoked from the state machine`
        //         }]
        //     }
        // };
    }

    public get stateMachine(): StateMachine {
        return this._stateMachine;
    }

    public get s3Bucket(): Bucket {
        return this._s3Bucket;
    }
}