/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LINSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { EventBus, Rule, Schedule } from '@aws-cdk/aws-events';
import { SfnStateMachine } from '@aws-cdk/aws-events-targets';
import { CfnPolicy, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { Code, Runtime } from "@aws-cdk/aws-lambda";
import { Bucket } from "@aws-cdk/aws-s3";
import { Chain, Choice, Condition, Fail, StateMachineType, Wait, WaitTime } from '@aws-cdk/aws-stepfunctions';
import { Aws, Construct, Duration } from "@aws-cdk/core";
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import { StepFuncLambdaTask } from "../text-analysis-workflow/lambda-task-construct";
import { Workflow } from "../text-analysis-workflow/workflow-construct";

export interface TopicOrchestrationProps {
    readonly ingestionWindow: string,
    readonly numberofTopics: string,
    readonly rawBucket: Bucket,
    readonly eventBus: EventBus,
    readonly topicsAnalaysisNameSpace: string,
    readonly topicMappingsNameSpace: string,
    readonly topicSchedule: string,
    readonly s3LoggingBucket: Bucket
}

export class TopicOrchestration extends Construct {
    constructor(scope: Construct, id: string, props: TopicOrchestrationProps) {
        super(scope, id);

        const lambdaPublishEventPolicy = new Policy(this, 'LambdaEventBusPolicy');
        lambdaPublishEventPolicy.addStatements(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [ props.eventBus.eventBusArn ],
            actions: [ 'events:PutEvents' ],
        }));

        const topicScheduleRule = new Rule (this, 'TopicSchedule', {
            schedule: Schedule.expression(`${props.topicSchedule}`)
        });

        const submitTopicTask = new StepFuncLambdaTask(this, 'SubmitTopic', {
            taskName: 'Submit',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-submit-topic-model`),
                environment: {
                    INGESTION_WINDOW: props.ingestionWindow,
                    RAW_BUCKET_FEED: props.rawBucket.bucketName,
                    NUMBER_OF_TOPICS: props.numberofTopics,
                    STACK_NAME: Aws.STACK_NAME
                },
                timeout: Duration.minutes(5),
                memorySize: 512
            },
            outputPath: '$'
        });

        const lambdaSubmitJobPolicy = new Policy(this, 'LambdaSubmitJobPolicy', {
            statements: [ new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'comprehend:StartTopicsDetectionJob'
                ],
                resources: [ '*' ]
            })]
        });

        lambdaSubmitJobPolicy.attachToRole(submitTopicTask.lambdaFunction.role as Role);
        (lambdaSubmitJobPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
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

        const inferenceLambdaToS3 = new LambdaToS3(this, 'TopicInference', {
            existingLambdaObj: submitTopicTask.lambdaFunction,
            bucketProps: {
                versioned: false,
                serverAccessLogsBucket: props.s3LoggingBucket,
                serverAccessLogsPrefix: `${id}-TopicInference/`
            }
        });
        props.rawBucket.grantRead(submitTopicTask.lambdaFunction.role as Role);

        const comprehendTopicAnalysisRole = new Role (this, 'TopicAnalysisRole', {
            assumedBy: new ServicePrincipal('comprehend.amazonaws.com'),
        });
        const lambdaComprehendPassRolePolicy = new Policy(this, 'LambdaComprehendPassPolicy', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [ 'iam:GetRole', 'iam:PassRole' ],
                    resources: [ comprehendTopicAnalysisRole.roleArn ]
                })
            ]
        });
        lambdaComprehendPassRolePolicy.attachToRole(submitTopicTask.lambdaFunction.role as Role);

        lambdaToS3.s3Bucket!.grantRead(comprehendTopicAnalysisRole);
        inferenceLambdaToS3.s3Bucket!.grantWrite(comprehendTopicAnalysisRole);

        submitTopicTask.lambdaFunction.addEnvironment('INGESTION_S3_BUCKET_NAME', lambdaToS3.s3Bucket!.bucketName);
        submitTopicTask.lambdaFunction.addEnvironment('DATA_ACCESS_ARN', comprehendTopicAnalysisRole.roleArn);
        submitTopicTask.lambdaFunction.addEnvironment('INFERENCE_BUCKET', inferenceLambdaToS3.s3Bucket!.bucketName!);

        const publsihTopicModel = new StepFuncLambdaTask(this, 'PublishTopic', {
            taskName: 'Publish Topic',
            lambdaFunctionProps: {
                runtime: Runtime.PYTHON_3_8,
                handler: 'lambda_function.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf_publish_topic_model` /*, { //TODO - for docker image to build dependencies
                    bundling:{
                        "image": Runtime.PYTHON_3_7.bundlingDockerImage,
                        "command": ["bash", "-c", "ls /asset-input /asset-output && pip install -r requirements.txt -t /asset-output && ls /asset-output && rsync -r . /asset-output"]
                    }
                }*/),
                environment: {
                    RAW_DATA_FEED: props.rawBucket.bucketName,
                    EVENT_BUS_NAME: props.eventBus.eventBusName,
                    TOPICS_EVENT_NAMESPACE: props.topicsAnalaysisNameSpace,
                    TOPIC_MAPPINGS_EVENT_NAMESPACE: props.topicMappingsNameSpace
                },
                timeout: Duration.minutes(10),
                memorySize: 256
            },
            outputPath: '$'
        });
        inferenceLambdaToS3.s3Bucket!.grantRead(publsihTopicModel.lambdaFunction);
        props.rawBucket.grantRead(publsihTopicModel.lambdaFunction);
        lambdaPublishEventPolicy.attachToRole(publsihTopicModel.lambdaFunction.role as Role);

        const checkTopicStatus = new StepFuncLambdaTask(this, 'CheckStatus', {
            taskName: 'Check Status',
            lambdaFunctionProps: {
                runtime: Runtime.NODEJS_12_X,
                handler: 'index.handler',
                code: Code.fromAsset(`${__dirname}/../../lambda/wf-check-topic-model`)
            },
            inputPath: '$',
            outputPath: '$.TopicsDetectionJobProperties'
        });

        const lambdaDescribeJobPolicy = new Policy(this, 'LambdaDescribeJobPolicy', {
            statements: [ new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'comprehend:DescribeTopicsDetectionJob'
                ],
                resources: [ '*' ]
            })]
        });
        lambdaDescribeJobPolicy.attachToRole(checkTopicStatus.lambdaFunction.role as Role);
        (lambdaDescribeJobPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                  id: 'W12',
                  reason: `The * resource allows lambda function to access Amazon Comprehend services for Topic Detection. The Comprehend services not have a resource arn. This permission is retricted to the lambda function responsible for accessing the Amazon Comprehend service`
                }]
            }
        };

        const jobStatusChoice = new Choice(this, 'JobComplete?', {
            comment: 'Check if the topic modeling job is complete',
            inputPath: '$'
        });

        const jobWait = new Wait(this, 'Wait', {
            time: WaitTime.duration(Duration.minutes(10))
        });

        jobStatusChoice.when(Condition.stringEquals('$.JobStatus', 'COMPLETED'), publsihTopicModel.stepFunctionTask);
        jobStatusChoice.when(Condition.stringEquals('$.JobStatus', 'IN_PROGRESS'), jobWait);
        jobStatusChoice.when(Condition.stringEquals('$.JobStatus', 'SUBMITTED'), jobWait);
        jobStatusChoice.otherwise(new Fail(this, 'JobFailed'));

        const chain = Chain.start(submitTopicTask.stepFunctionTask)
                            .next(jobWait)
                            .next(checkTopicStatus.stepFunctionTask)
                            .next(jobStatusChoice);

        const topicWorkflow = new Workflow(this, 'TopicModelWF', {
            stateMachineType: StateMachineType.STANDARD,
            chain: chain
        });
        topicScheduleRule.addTarget(new SfnStateMachine(topicWorkflow.stateMachine));
    }
}