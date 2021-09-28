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

import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from "@aws-cdk/core";
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import { PlatformType } from '../ingestion/platform-type';
import { StepFuncLambdaTask } from "../text-analysis-workflow/lambda-task-construct";
import { Workflow } from "../text-analysis-workflow/workflow-construct";

export interface TopicOrchestrationProps {
    readonly ingestionWindow: string;
    readonly numberofTopics: string;
    readonly rawBucket: s3.Bucket;
    readonly eventBus: events.EventBus;
    readonly topicsAnalaysisNameSpace: string;
    readonly topicMappingsNameSpace: string;
    readonly topicSchedule: string;
    readonly s3LoggingBucket: s3.Bucket;
    readonly platformTypes: PlatformType[];
}

export class TopicOrchestration extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: TopicOrchestrationProps) {
        super(scope, id);

        const lambdaPublishEventPolicy = new iam.Policy(this, 'LambdaEventBusPolicy');
        lambdaPublishEventPolicy.addStatements(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ props.eventBus.eventBusArn ],
            actions: [ 'events:PutEvents' ],
        }));

        const topicScheduleRule = new events.Rule (this, 'TopicSchedule', {
            schedule: events.Schedule.expression(`${props.topicSchedule}`)
        });

        const submitTopicTask = new StepFuncLambdaTask(this, 'SubmitTopic', {
            taskName: 'Submit',
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../../lambda/wf-submit-topic-model`),
                environment: {
                    INGESTION_WINDOW: props.ingestionWindow,
                    RAW_BUCKET_FEED: props.rawBucket.bucketName,
                    // select prefix names if the source type has topic modelling set to true. Sending the prefix values to the
                    // lambda function as comma separated values
                    SOURCE_PREFIX: props.platformTypes.filter((type) => type.topicModelling).map((type) => type.name).join(","),
                    NUMBER_OF_TOPICS: props.numberofTopics,
                    STACK_NAME: cdk.Aws.STACK_NAME
                },
                timeout: cdk.Duration.minutes(10),
                memorySize: 256
            },
            outputPath: '$.Payload'
        });

        const lambdaSubmitJobPolicy = new iam.Policy(this, 'LambdaSubmitJobPolicy', {
            statements: [ new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'comprehend:StartTopicsDetectionJob'
                ],
                resources: [ '*' ]
            })]
        });

        lambdaSubmitJobPolicy.attachToRole(submitTopicTask.lambdaFunction.role as iam.Role);
        (lambdaSubmitJobPolicy.node.defaultChild as iam.CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Comprehend services for Topic Detection. The Comprehend services not have a resource arn. This permission is retricted to the lambda function responsible for accessing the Amazon Comprehend service`
                }]
            }
        };

        const lambdaToS3 = new LambdaToS3(this, 'TopicIngestion', {
            existingLambdaObj: submitTopicTask.lambdaFunction,
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}-TopicIngestion/`
            }
        });

        props.rawBucket.grantRead(submitTopicTask.lambdaFunction.role as iam.Role);

        const comprehendTopicAnalysisRole = new iam.Role (this, 'TopicAnalysisRole', {
            assumedBy: new iam.ServicePrincipal('comprehend.amazonaws.com'),
        });
        const lambdaComprehendPassRolePolicy = new iam.Policy(this, 'LambdaComprehendPassPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [ 'iam:GetRole', 'iam:PassRole' ],
                    resources: [ comprehendTopicAnalysisRole.roleArn ]
                })
            ]
        });
        lambdaComprehendPassRolePolicy.attachToRole(submitTopicTask.lambdaFunction.role as iam.Role);

        lambdaToS3.s3Bucket!.grantReadWrite(comprehendTopicAnalysisRole);

        submitTopicTask.lambdaFunction.addEnvironment('INGESTION_S3_BUCKET_NAME', lambdaToS3.s3Bucket!.bucketName);
        submitTopicTask.lambdaFunction.addEnvironment('DATA_ACCESS_ARN', comprehendTopicAnalysisRole.roleArn);

        const platformTypes = props.platformTypes.filter((type) => type.topicModelling).map((type) => type.name)
        const parallel = new sfn.Parallel(this, 'PublishTopic', {
            comment: 'Parallely process various platform types',
            inputPath: '$',
            outputPath: '$'
        });

        const _publishTopicsMappings = new SqsToLambda(this, 'PublishTopicMapping', {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.PYTHON_3_8,
                handler: 'lambda_function.topic_mapping_handler',
                code: lambda.Code.fromAsset('lambda/wf_publish_topic_model'),
                environment: {
                    RAW_DATA_FEED: props.rawBucket.bucketName,
                    EVENT_BUS_NAME: props.eventBus.eventBusName,
                    TOPICS_EVENT_NAMESPACE: props.topicsAnalaysisNameSpace,
                    TOPIC_MAPPINGS_EVENT_NAMESPACE: props.topicMappingsNameSpace,
                    SOURCE_PREFIX: platformTypes.join(',')
                },
                timeout: cdk.Duration.minutes(15),
                memorySize: 256
            },
            sqsEventSourceProps: {
                batchSize: 1
            },
            queueProps: {
                visibilityTimeout: cdk.Duration.minutes(120)
            }
        });

        props.rawBucket.grantRead(_publishTopicsMappings.lambdaFunction);
        lambdaPublishEventPolicy.attachToRole(_publishTopicsMappings.lambdaFunction.role as iam.Role);

        for (const platformType of platformTypes) {
            const _publishTopicTerms = new StepFuncLambdaTask(this, `${platformType}PublishTopicTerms`, {
                taskName: `Publish Topic Terms for ${platformType}`,
                lambdaFunctionProps: {
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.topic_terms_handler',
                    code: lambda.Code.fromAsset('lambda/wf_publish_topic_model'),
                    environment: {
                        RAW_DATA_FEED: props.rawBucket.bucketName,
                        EVENT_BUS_NAME: props.eventBus.eventBusName,
                        TOPICS_EVENT_NAMESPACE: props.topicsAnalaysisNameSpace,
                        TOPIC_MAPPINGS_EVENT_NAMESPACE: props.topicMappingsNameSpace,
                        SOURCE_PREFIX: platformType,
                        QUEUE_NAME: _publishTopicsMappings.sqsQueue.queueName
                    },
                    timeout: cdk.Duration.minutes(15),
                },
                outputPath: '$.Payload'
            });
            props.rawBucket.grantRead(_publishTopicTerms.lambdaFunction);
            lambdaToS3.s3Bucket?.grantRead(_publishTopicTerms.lambdaFunction);
            lambdaPublishEventPolicy.attachToRole(_publishTopicTerms.lambdaFunction.role as iam.Role);

            const _publishTopics = new StepFuncLambdaTask(this, `${platformType}PublishTopics`, {
                taskName: `Publish Topics for ${platformType}`,
                lambdaFunctionProps: {
                    runtime: lambda.Runtime.PYTHON_3_8,
                    handler: 'lambda_function.topic_handler',
                    code: lambda.Code.fromAsset('lambda/wf_publish_topic_model'),
                    environment: {
                        RAW_DATA_FEED: props.rawBucket.bucketName,
                        EVENT_BUS_NAME: props.eventBus.eventBusName,
                        TOPICS_EVENT_NAMESPACE: props.topicsAnalaysisNameSpace,
                        TOPIC_MAPPINGS_EVENT_NAMESPACE: props.topicMappingsNameSpace,
                        SOURCE_PREFIX: platformType,
                        QUEUE_NAME: _publishTopicsMappings.sqsQueue.queueName
                    },
                    timeout: cdk.Duration.minutes(15),
                    memorySize: 256 // with youtube, the size of the dictionary in the lambda is bigger
                },
                outputPath: '$.Payload'
            });
            lambdaToS3.s3Bucket?.grantRead(_publishTopics.lambdaFunction);
            _publishTopicsMappings.sqsQueue.grantSendMessages(_publishTopics.lambdaFunction);

            const _nestedParallel = new sfn.Parallel(this, `PublishTopicFor${platformType}`, {
                comment: `Parallely process topic inferences for ${platformType}`,
                inputPath: '$',
                outputPath: '$'
            });

            _nestedParallel.branch(_publishTopicTerms.stepFunctionTask);
            _nestedParallel.branch(_publishTopics.stepFunctionTask);
            parallel.branch(_nestedParallel);
        }

        const checkTopicStatus = new StepFuncLambdaTask(this, 'CheckStatus', {
            taskName: 'Check Status',
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../../lambda/wf-check-topic-model`),
                environment: {
                    SOURCE_PREFIX: platformTypes.join(',')
                }
            },
            inputPath: '$',
            outputPath: '$.Payload'
        });

        const lambdaDescribeJobPolicy = new iam.Policy(this, 'LambdaDescribeJobPolicy', {
            statements: [ new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'comprehend:DescribeTopicsDetectionJob'
                ],
                resources: [ '*' ]
            })]
        });
        lambdaDescribeJobPolicy.attachToRole(checkTopicStatus.lambdaFunction.role as iam.Role);
        (lambdaDescribeJobPolicy.node.defaultChild as iam.CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Comprehend services for Topic Detection. The Comprehend services not have a resource arn. This permission is retricted to the lambda function responsible for accessing the Amazon Comprehend service`
                }]
            }
        };

        const jobSubmittedChoice = new sfn.Choice(this, 'JobSubmitted?', {
            comment: 'Check if the topic modeling job is submitted',
            inputPath: '$'
        });

        const jobStatusChoice = new sfn.Choice(this, 'JobComplete?', {
            comment: 'Check if the topic modeling job is complete',
            inputPath: '$'
        });

        const jobWait = new sfn.Wait(this, 'Wait', {
            time: sfn.WaitTime.duration(cdk.Duration.minutes(10))
        });

        jobSubmittedChoice.when(sfn.Condition.stringEquals('$.JobStatus', 'NO_DATA'), new sfn.Fail(this, 'NoData'));
        jobSubmittedChoice.when(sfn.Condition.stringEquals('$.JobStatus', 'FAILED'), new sfn.Fail(this, 'SubmitFailed'));
        jobSubmittedChoice.otherwise(checkTopicStatus.stepFunctionTask);
        checkTopicStatus.stepFunctionTask.next(jobStatusChoice);
        jobStatusChoice.when(sfn.Condition.stringEquals('$.JobStatus', 'COMPLETED'), parallel);
        jobStatusChoice.when(sfn.Condition.stringEquals('$.JobStatus', 'IN_PROGRESS'), jobWait);
        jobStatusChoice.when(sfn.Condition.stringEquals('$.JobStatus', 'SUBMITTED'), jobWait);
        jobStatusChoice.otherwise(new sfn.Fail(this, 'JobFailed'));
        jobWait.next(checkTopicStatus.stepFunctionTask);

        const chain = sfn.Chain.start(submitTopicTask.stepFunctionTask).next(jobSubmittedChoice)

        const topicWorkflow = new Workflow(this, 'TopicModelWF', {
            stateMachineType: sfn.StateMachineType.STANDARD,
            chain: chain
        });
        topicScheduleRule.addTarget(new targets.SfnStateMachine(topicWorkflow.stateMachine));

        (topicWorkflow.stateMachine.role.node.tryFindChild('DefaultPolicy')?.node.findChild('Resource') as iam.CfnPolicy).addMetadata("cfn_nag",{
            rules_to_suppress: [{
                id: 'W76',
                reason: 'The statemachine invokes multiple lambdas and the policy is narrowed down to the specific lambda resource arn. '+
                    'Hence it has multiple policy statements resulting in a higher SPCM value',
            }, {
                id: 'W12',
                reason: 'The "LogDelivery" actions do not support resource-level authorization'
            }]
        });
    }
}
