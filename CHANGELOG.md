# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.2] - 2023-01-11

### Fixed

- Update AWS CDK, Nodejs and Python library updates

## [2.1.1] - 2022-12-19

### Fixed

- GitHub [issue #75](https://github.com/aws-solutions/discovering-hot-topics-using-machine-learning/issues/75). This fix prevents AWS Service Catalog AppRegistry Application Name and Attribute Group Name from using a string that begins with `AWS`, since strings begining with `AWS` are considered as reserved words by the AWS Service.

## [2.1.0] - 2022-12-05

### Added

- [Service Catalog AppRegistry](https://docs.aws.amazon.com/servicecatalog/latest/arguide/intro-app-registry.html) resource to register the CloudFormation template and underlying resources as an application in both Service Catalog AppRegistry and AWS Systems Manager Application Manager

## [2.0.1] - 2022-11-16

### Fixed

- Github [issue #69](https://github.com/aws-solutions/discovering-hot-topics-using-machine-learning/issues/69). The fix required the ingestion infrastructure code in CDK to be pass the AWS CloudFormation parameter to be passed to the Reddit nested stack.

### Updated

- CDK version 1.177.0
- AWS SDK verson 2.1223.0

## [2.0.0] - 2022-05-31

### Added

- The capability to ingest Subreddit comments using the Reddit API

### Updated

- CDK version 1.152.0
- AWS SDK version 2.1127.0
- Amazon QuickSight dashboard to support NLP analysis on Subreddit comments

## [1.7.1] - 2022-03-29

### Updated

- node and python module version dependencies

## [1.7.0] - 2022-02-14

### Added

- The capability to ingest custom data by uploading files as JSON, XLSX, or CSV files

### Updated

- Use Amazon Kinesis Data Firehose partition projection to store and partition the data by source date (instead of system processing date)
- Use Amazon Athena dynamic partitioning features to run SQL queries on data stored in S3 bucket
- AWS CDK version 1.137.0
- AWS SDK version 2.1067.0

### Removed

- Creating of AWS Glue partitions (replaced with Amazon Athena dynamic partitions)

## [1.6.1] - 2021-10-26

### Fixed

- GitHub [issue #42](https://github.com/aws-solutions/discovering-hot-topics-using-machine-learning/issues/42). To fix the issue, RSS feed ingestion lambda function and SQLs related to the Amazon QuickSight dashboard were updated.

### Updated

- AWS CDK version to 1.125.0
- AWS SDK version to 2.1008.0

## [1.6.0] - 2021-09-27

### Added

- Capability to ingest YouTube comments

### Updated

- AWS CDK version to 1.121.0
- AWS SDK version to 2.991.0
- Updated Amazon QuickSight analysis and dashboard to reflect the new ingestion source

## [1.5.0] - 2021-07-22

### Added

- Ingest RSS feeds from over ~3000+ news websites across the world

### Updated

- AWS CDK version to 1.110.1
- AWS SDK version to 2.945.0
- Updated Nodejs Lambda runtimes to use Nodejs 14.x
- Updated Amazon QuickSight analysis and dashboard to reflect the new ingestion source
- Updated AWS StepFunction workflows to handle parallel ingestion (tweets from Twitter and RSS feeds from News websites)

### Fixed

- Truncated tweets through merging [GitHub pull request #26](https://github.com/aws-solutions/discovering-hot-topics-using-machine-learning/pull/26)

## [1.4.0] - 2021-02-04

### Added

- Capability to use geo coordinates when invoking the Twitter API to filter tweets returned by its Search API
- New visuals and sheets (tabs) on Amazon QuickSight to perform analysis using geo coordinates (when available with tweets)
- Additional remediation to handle throttling conditions from Twitter v1.1 API calls and push additional information to Amazon CloudWatch Logs that can be used to create alarms or notifications using CloudWatch Metric Filters

### Updated

- Switched to AWS Managed KMS keys for AWS Glue Security Configuration
- AWS CDK version to 1.83.0
- AWS SDK version to 2.828.0

## [1.3.0] - 2020-11-24

### Changed

- Implementation to refactor and to reuse the following architecture patterns from [AWS Solutions Constructs](https://aws.amazon.com/solutions/constructs/)
  - aws-kinesisfirehose-s3
  - aws-kinesisstreams-lambda
  - aws-lambda-step-function

### Updated

- The join condition for Topic Modeling in Amazon QuickSight dataset to provide accurate topic identification for a specific run
- ID and name generation for Amazon QuickSigh resource to use dynamic value based on the stack name
- AWS CDK version to 1.73.0
- AWS SDK version to 2.790.0

## [1.2.0] - 2020-10-29

### Added

- New and simplified interactive Amazon QuickSight dashboard that is now automatically generated through an AWS CloudFormation deployment and that customers can extend to suit their business case

### Updated

- Updated to AWS CDK v1.69.0
- Consolidate Amazon S3 access Log bucket across the solution. All access log files have a prefix that corresponds to the bucket for which they are generated

## [1.1.0] - 2020-09-29

### Updated

- S3 storage for inference outputs to use Apache Parquet
- Add partitioning to AWS Glue tables
- Update to AWS CDK v1.63.0
- Update to AWS SDK v2.755.0

## [1.0.0] - 2020-08-28

### Added

- Initial release
