## Discovering Hot Topics using Machine Learning

The Discovering Hot Topics Using Machine Learning solution identifies the most dominant topics associated with your products, policies, events, and brands. This enables you to react quickly to new growth opportunities, address negative brand associations, and deliver a higher level of customer satisfaction for your business. In addition to helping you understand what your customers are saying about your brand, this solution gives you insights into topics that are relevant to your business.

This solution deploys an AWS CloudFormation template to automate data ingestion from these sources:

- Twitter
- RSS news feeds
- YouTube comments tied to videos
- Reddit (comments from subreddits of interest)
- custom data in JSON or XLSX format

**Note**: Twitter ingestion is temporarily disabled starting release v2.2.0 as Twitter has retired v1 APIs.

This solution uses pre-trained machine learning (ML) models from Amazon Comprehend, Amazon Translate, and Amazon Rekognition to provide these benefits:

- **Detecting dominant topics using topic modeling**-identifies the terms that collectively form a topic.
- **Identifying the sentiment of what customers are saying**—uses contextual semantic search to understand the nature of online discussions.
- **Determining if images associated with your brand contain unsafe content**—detects unsafe and negative imagery in content.
- **Helping you identify insights in near-real-time**—uses a visual dashboard to understand context, threats, and opportunities almost instantly.

The solution can be customized to aggregate other social media platforms and internal enterprise systems. The default CloudFormation deployment sets up custom ingestion configuration with parameters and an Amazon Simple Storage Service (Amazon S3) bucket to allow Amazon Transcribe Call Analytics output to be processed for natural language processing (NLP) analysis.

With minimal configuration changes in the custom ingestion functionality, this solution can ingest data from both internal systems and external data sources, such as transcriptions from call center calls, product reviews, movie reviews, and community chat forums including Twitch and Discord. This is done by exporting the custom data in JSON or XLSX format from the respective platforms and then uploading it to an Amazon Simple Storage Service (Amazon S3) bucket that is created when deploying this solution. More details on how to customize this feature, please refer [Customizing Amazon S3 ingestion](https://docs.aws.amazon.com/solutions/latest/discovering-hot-topics-using-machine-learning/s3-ingestion.html).

For a detailed solution deployment guide, refer to [Discovering Hot Topics using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning)

## On this Page

- [Architecture Overview](#architecture-overview)
- [Deployment](#deployment)
- [Source Code](#source-code)
- [Creating a custom build](#creating-a-custom-build)

## Architecture Overview

Deploying this solution with the default parameters builds the following environment in the AWS Cloud. The overall architecture of the solution has the following key components. Note that the below diagram represents Twitter and news feeds as ingestion sources - there are plans to add other social media platforms in future releases.

<p align="center">
  <img src="source/images/architecture.png">
  <br/>
</p>

The architecture of the solution includes the following key components and workflows:

1. Ingestion – Twitter, RSS feeds, YouTube comments, Reddit ingestion and management using Lambda functions, Amazon DynamoDB, and Amazon CloudWatch Event Scheduler. For detailed reference architecture diagrams for Twitter, YouTube comment, RSS news feed, and Reddit ingestion refer to the [implementation guide](https://docs.aws.amazon.com/solutions/latest/discovering-hot-topics-using-machine-learning/overview.html).

2. Data Stream — The data is buffered through Amazon Kinesis Data Streams to provide resiliency and throttle incoming requests. The Data Streams have a configured DLQ to catch any errors in processing feeds.

3. Workflow – Consumer (Lambda function) of the Data Streams initiates a Step Functions workflow that orchestrates Amazon Machine Learning capabilities including: Amazon Translate, Amazon Comprehend, and Amazon Rekognition.

4. Integration – The inference data integrates with the storage components through an event-driven architecture using Amazon EventBridge. EventBridge allows further customization to add additional targets by configuring rules.

5. Storage and Visualization – A combination of Kinesis Data Firehose, Amazon S3 buckets, AWS Glue tables, Amazon Athena, and Amazon QuickSight.

<p align="center">
  <img src="source/images/dashboard.png">
  <br/>
</p>

After you deploy the solution, use the included Amazon QuickSight dashboard to visualize the solution's machine learning inferences. The image above is an example visualization dashboard featuring a dominant topic list, donut charts, weekly and monthly trend graphs, a word cloud, a tweet table, and a heat map.

# AWS CDK Constructs

[AWS CDK Solutions Constructs](https://aws.amazon.com/solutions/constructs/) make it easier to consistently create well-architected applications. All AWS Solutions Constructs are reviewed by AWS and use best practices established by the AWS Well-Architected Framework. This solution uses the following AWS CDK Constructs:

- aws-events-rule-lambda
- aws-kinesisfirehose-s3
- aws-kinesisstreams-lambda
- aws-lambda-dynamodb
- aws-lambda-s3
- aws-lambda-stepfunctions
- aws-sqs-lambda

## Deployment

The solution is deployed using a CloudFormation template with a lambda backed custom resource that builds the Amazon QuickSight Analaysis and Dashboards. For details on deploying the solution please see the details on the solution home page: [Discovering Hot Topics Using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning/)

## Source Code

### Project directory structure

```
├── deployment                          [folder containing build scripts]
│   ├── cdk-solution-helper             [A helper function to help deploy lambda function code through S3 buckets]
│   ├── build-s3-dist.sh                [Build script to build the solution]
└── source                              [source code containing CDK App and lambda functions]
    ├── bin                             [entrypoint of the CDK application]
    ├── lambda                          [folder containing source code the lambda functions]
    │   ├── capture_news_feed           [lambda function to ingest news feeds]
    │   ├── firehose_topic_proxy        [lambda function to write topic analysis output to Amazon Kinesis Firehose]
    │   ├── firehose-text-proxy         [lambda function to write text analysis output to Amazon Kinesis Firehose]
    │   ├── ingestion-consumer          [lambda function that consumes messages from Amazon Kinesis Data Streams]
    │   ├── ingestion-custom            [lambda function that reads files from Amazon S3 bucket and pushes data to Amazon Kinesis Data Streams]
    │   ├── ingestion-producer          [lambda function that makes Twitter API call and pushes data to Amazon Kinesis Data Stream]
    │   ├── ingestion-publish-subreddit [lambda function that publishes Eventbridge (CloudWatch) events for the subreddits to ingest information from. This event triggers ingestion_reddit_comments lambda which retrieves comments from subreddit]
    │   ├── ingestion_reddit_comments   [lambda function that makes Reddit API call to retrieve comments from subreddits of interest and pushes data to Amazon Kinesis Data Stream]
    │   ├── ingestion-youtube           [lambda function that ingests comments from YouTube videos and pushes data to Amazon Kinesis Data Streams]
    │   ├── integration                 [lambda function that publishes inference outputs to Amazon Events Bridge]
    │   ├── layers                      [lambda layer function library for Node and Python layers]
    │   │   ├── aws-nodesdk-custom-config
    │   │   ├── python_lambda_layer
    │   ├── quicksight-custom-resources [lambda function to create Amazon QuickSight resources, example: data source, data sets, analysis and dashboards]
    │   ├── solution_helper             [lambda function that allows capturing metrics for this solution]
    │   ├── storage-firehose-processor  [lambda function that writes data to S3 buckets to build a relational model]
    │   ├── wf-analyze-text             [lambda function to detect sentiments, key phrases and entities using Amazon Comprehend]
    │   ├── wf-check-topic-model        [lambda function to check status of topic modeling jobs on Amazon Comprehend]
    │   ├── wf-detect-language          [lambda function to detect language of ingested text content using Amazon Comprehend]
    │   ├── wf-detect-moderation-labels [lambda function to detect content moderation using Amazon Rekognition]
    │   ├── wf-extract-text-in-image    [lambda function to extract text content from images using Amazon Rekognition]
    │   ├── wf-publish-text-inference   [lambda function to publish Amazon Comprehend inferences]
    │   ├── wf-submit-topic-model       [lambda function to submit topic modeling job]
    │   ├── wf-translate-text           [lambda function to translate non-english text using Amazon Translate]
    │   └── wf_publish_topic_model      [lambda function to publish topic modeling inferences from Amazon Comprehend]
    ├── lib
    │   ├── aspects                     [CDK Aspects definitions to inject attributes during the prepare phase]
    │   ├── awsnodejs-lambda-layer      [Lambda layer construct for lambda functions that run on Nodejs runtime]
    │   ├── ingestion                   [CDK constructs for data ingestion]
    │   ├── integration                 [CDK constructs for Amazon Events Bridge]
    │   ├── quicksight-custom-resources [CDK construct that invokes custom resources to create Amazon QuickSight resources]
    │   ├── s3-event-notification       [CDK construct that configures S3 events to be pushed to Amazon EventBridge]
    │   ├── storage                     [CDK constructs that define storage of the inference events]
    │   ├── text-analysis-workflow      [CDK constructs for text analysis of ingested data]
    │   ├── topic-analysis-workflow     [CDK constructs for topic visualization of ingested data]
    │   └── visualization               [CDK constructs to build a relational database model for visualization]
    ├── discovering-hot-topics.ts
```

## Creating a custom build

The solution can be deployed through the CloudFormation template available on the solution home page: [Discovering Hot Topics Using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning/). To make changes to the solution, using the below steps download or clone this repo, update the source code and then run the deployment/build-s3-dist.sh script to deploy the updated Lambda code to an Amazon S3 bucket in your account.

### 1. Clone the repository

Clone this git repository

`git clone https://github.com/aws-solutions/<repository_name>`

### 2. Build the solution for deployment

- To run the unit tests

```
cd <rootDir>/source
chmod +x ./run-all-tests.sh
./run-all-tests.sh
```

- Configure environment variables for build

Configure below environment variables. Note: The values provided below are example values only.
```
export DIST_OUTPUT_BUCKET=my-bucket-name  #This is the global name of the distribution. For the bucket name, the AWS Region is added to the global name (example: 'my-bucket-name-us-east-1') to create a regional bucket. The lambda artifact should be uploaded to the regional buckets for the CloudFormation template to pick it up for deployment.

export SOLUTION_NAME=discovering-hot-topics-using-machine-learning  #The name of this solution
export VERSION=my-version #version number for the customized code
export CF_TEMPLATE_BUCKET_NAME=my-cf-template-bucket-name #The name of the S3 bucket where the CloudFormation templates should be uploaded
export QS_TEMPLATE_ACCOUNT=aws-account-id   #The AWS account Id from which the Amazon QuickSight templates should be sourced for Amazon QuickSight Analysis and Dashboard creation
export DIST_QUICKSIGHT_NAMESPACE=my-quicksight-namespace  #Quicksight namespace
```

- Run below commands to build the distributable:

```
cd <rootDir>/deployment
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION $CF_TEMPLATE_BUCKET_NAME $QS_TEMPLATE_ACCOUNT $DIST_QUICKSIGHT_NAMESPACE

```

- When creating and using buckets it is recommeded to:

  - Use randomized names or uuid as part of your bucket naming strategy.
  - Ensure buckets are not public.
  - Verify bucket ownership prior to uploading templates or code artifacts.

### 3. Upload deployment assets to your Amazon S3 buckets
- Deploy the distributable to an Amazon S3 bucket in your account. _Note:_ you must have the AWS Command Line Interface installed.

```
aws s3 cp ./global-s3-assets/ s3://$CF_TEMPLATE_BUCKET_NAME/discovering-hot-topics-using-machine-learning/$VERSION/ --recursive --acl bucket-owner-full-control --profile aws-cred-profile-name
aws s3 cp ./regional-s3-assets/ s3://$DIST_OUTPUT_BUCKET-<aws_region>/discovering-hot-topics-using-machine-learning/$VERSION/ --recursive --acl bucket-owner-full-control --profile aws-cred-profile-name
```

### 4. Launch the CloudFormation template
- Get the link of the template uploaded to Amazon S3 bucket ($CF_TEMPLATE_BUCKET_NAME bucket from previous step)
- Deploy the solution to your account by launching a new AWS CloudFormation stack


## Collection of operational metrics

This solution collects anonymous operational metrics to help AWS improve the quality and features of the solution. For more information, including how to disable this capability, please see the [implementation guide](https://docs.aws.amazon.com/solutions/latest/discovering-hot-topics-using-machine-learning/operational-metrics.html).

---

Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
