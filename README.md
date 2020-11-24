## Discovering Hot Topics using Machine Learning

The Discovering Hot Topics Using Machine Learning solution helps you identify the most dominant topics associated with your products, policies, events, and brands. Implementing this solution helps you react quickly to new growth opportunities, address negative brand associations, and deliver higher levels of customer satisfaction.

The solution uses machine learning algorithms to automate digital asset (text and image) ingestion and perform near real-time topic modeling, sentiment analysis, and image detection. The solution then visualizes these large-scale customer analyses using an Amazon QuickSight dashboard. This guide provides step-by-step instructions to building a dashboard that provides you with the context and insights necessary to identify trends that help or harm you brand.

The solution performs the following key features:

-   **Performs topic modeling to detect dominant topics**: identifies the terms that collectively form a topic from within customer feedback
-   **Identifies the sentiment of what customers are saying**: uses contextual semantic search to understand the nature of online discussions
-   **Determines if images associated with your brand contain unsafe content**: detects unsafe and negative imagery in content
-   **Helps customers identify insights in near real-time**: you can use a visualization dashboard to better understand context, threats, and opportunities almost instantly

For an overview and solution deployment guide, please visit [Discovering Hot Topics using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning)

## On this Page

-   [Architecture Overview](#architecture-overview)
-   [Deployment](#deployment)
-   [Source Code](#source-code)
-   [Creating a custom build](#creating-a-custom-build)

## Architecture Overview

Deploying this solution with the default parameters builds the following environment in the AWS Cloud. The overall architecture of the solution has the following key components. Note that the below diagram represents Twitter as the ingestion feed - there are plans to add other social media platforms in future releases.

<p align="center">
  <img src="source/images/architecture.png">
  <br/>
</p>

-   Ingestion – Social media feed ingestion using a combination of Lambda functions, Kinesis Data Stream and DynamoDB to manage state
-   Workflow – An AWS Step Function based workflow to orchestrate various services
-   Inference – AWS Cloud’s machine learning capabilities through Amazon Translate, Amazon Comprehend, and Amazon Rekognition
-   Application Integration – Event based architecture approach through the use of AWS Events Bridge
-   Storage and Visualization – A combination of Kinesis Data Firehose, S3 Buckets, Glue, Athena and QuickSight

<p align="center">
  <img src="source/images/dashboard.png">
  <br/>
</p>

After you deploy the solution, use the included Amazon QuickSight dashboard to visualize the solution's machine learning inferences. The image above is an example visualization dashboard featuring a dominant topic list, donut charts, weekly and monthly trend graphs, a word cloud, a tweet table, and a heat map.

# AWS CDK Constructs

[AWS CDK Solutions Constructs](https://aws.amazon.com/solutions/constructs/) make it easier to consistently create well-architected applications. All AWS Solutions Constructs are reviewed by AWS and use best practices established by the AWS Well-Architected Framework. This solution uses the following AWS CDK Constructs:

-   aws-events-rule-lambda
-   aws-kinesisfirehose-s3
-   aws-kinesisstreams-lambda
-   aws-lambda-dynamodb
-   aws-lambda-s3
-   aws-lambda-step-function

## Deployment

The solution is deployed using a CloudFormation template with a lambda backed custom resource that builds the Amazon QuickSight Analaysis and Dashboards. For details on deploying the solution please see the details on the solution home page: [Discovering Hot Topics Using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning/)

## Source Code

### Project directory structure

```
├── deployment                          [folder containing build scripts]
│   ├── cdk-solution-helper             [A helper function to help deploy lambda function code through S3 buckets]
└── source                              [source code containing CDK App and lambda functions]
    ├── bin                             [entrypoint of the CDK application]
    ├── lambda                          [folder containing source code the lambda functions]
    │   ├── firehose-text-proxy         [lambda function to write text analysis output to Amazon Kinesis Firehose]
    │   ├── firehose_topic_proxy        [lambda function to write topic analysis output to Amazon Kinesis Firehose]
    │   ├── ingestion-consumer          [lambda function that consumes messages from Amazon Kinesis Data Stream]
    │   ├── ingestion-producer          [lambda function that makes Twitter API call and pushes data to Amazon Kinesis Data Stream]
    │   ├── integration                 [lambda function that publishes inference outputs to Amazon Events Bridge]
    │   ├── storage-firehose-processor  [lambda function that writes data to S3 buckets to build a relational model]
    │   ├── wf-analyze-text             [lambda function to detect sentiments, key phrases and entities using Amazon Comprehend]
    │   ├── wf-check-topic-model        [lambda function to check status of topic modeling jobs on Amazon Comprehend]
    │   ├── wf-detect-moderation-labels [lambda function to detect content moderation using Amazon Rekognition]
    │   ├── wf-extract-text-in-image    [lambda function to extract text content from images using Amazon Rekognition]
    │   ├── wf-publish-text-inference   [lambda function to publish Amazon Comprehend inferences]
    │   ├── wf-submit-topic-model       [lambda function to submit topic modeling job]
    │   ├── wf-translate-text           [lambda function to translate non-english text using Amazon Translate]
    │   └── wf_publish_topic_model      [lambda function to publish topic modeling inferences from Amazon Comprehend]
    ├── lib
    │   ├── ingestion                   [CDK constructs for data ingestion]
    │   ├── integration                 [CDK constructs for Amazon Events Bridge]
    │   ├── storage                     [CDK constructs that define storage of the inference events]
    │   ├── text-analysis-workflow      [CDK constructs for text analysis of ingested data]
    │   ├── topic-analysis-workflow     [CDK constructs for topic visualization of ingested data]
    │   └── visualization               [CDK constructs to build a relational database model for visualization]
```

## Creating a custom build

The solution can be deployed through the CloudFormation template available on the solution home page: [Discovering Hot Topics Using Machine Learning](https://aws.amazon.com/solutions/implementations/discovering-hot-topics-using-machine-learning/). To make changes to the solution, using the below steps download or clone this repo, update the source code and then run the deployment/build-s3-dist.sh script to deploy the updated Lambda code to an Amazon S3 bucket in your account.

### 1. Clone the repository

Clone this git repository

`git clone https://github.com/awslabs/<repository_name>`

### 2. Build the solution for deployment

-   To run the unit tests

```
cd <rootDir>/source
chmod +x ./run-all-tests.sh
./run-all-tests.sh
```

-   Configure the bucket name of your target Amazon S3 distribution bucket

```
export DIST_OUTPUT_BUCKET=my-bucket-name
export VERSION=my-version
```

-   Now build the distributable:

```
cd <rootDir>/deployment
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION $CF_TEMPLATE_BUCKET_NAME QS_TEMPLATE_ACCOUNT

```

-   Parameter details

```
$DIST_OUTPUT_BUCKET - This is the global name of the distribution. For the bucket name, the AWS Region is added to the global name (example: 'my-bucket-name-us-east-1') to create a regional bucket. The lambda artifact should be uploaded to the regional buckets for the CloudFormation template to pick it up for deployment.
$SOLUTION_NAME - The name of This solution (example: discovering-hot-topics-using-machine-learning)
$VERSION - The version number of the change
$CF_TEMPLATE_BUCKET_NAME - The name of the S3 bucket where the CloudFormation templates should be uploaded
$QS_TEMPLATE_ACCOUNT - The account from which the Amazon QuickSight templates should be sourced for Amazon QuickSight Analysis and Dashboard creation
```

-   Deploy the distributable to an Amazon S3 bucket in your account. _Note:_ you must have the AWS Command Line Interface installed.

```
aws s3 cp ./global-s3-assets/ s3://my-bucket-name-<aws_region>/discovering-hot-topics-using-machine-learning/<my-version>/ --recursive --acl bucket-owner-full-control --profile aws-cred-profile-name
aws s3 cp ./regional-s3-assets/ s3://my-bucket-name-<aws_region>/discovering-hot-topics-using-machine-learning/<my-version>/ --recursive --acl bucket-owner-full-control --profile aws-cred-profile-name
```

---

Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
