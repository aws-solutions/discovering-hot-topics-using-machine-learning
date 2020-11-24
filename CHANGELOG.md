# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2020-11-24

### Changed

-   Implementation to refactor and to reuse the following architecture patterns from [AWS Solutions Constructs](https://aws.amazon.com/solutions/constructs/)
    -   aws-kinesisfirehose-s3
    -   aws-kinesisstreams-lambda
    -   aws-lambda-step-function

### Updated

-   The join condition for Topic Modeling in Amazon QuickSight dataset to provide accurate topic identification for a specific run
-   ID and name generation for Amazon QuickSigh resource to use dynamic value based on the stack name
-   AWS CDK version to 1.73.0
-   AWS SDK version to 2.790.0

## [1.2.0] - 2020-10-29

### Added

-   New and simplified interactive Amazon QuickSight dashboard that is now automatically generated through an AWS CloudFormation deployment and that customers can extend to suit their business case

### Updated

-   Updated to AWS CDK v1.69.0
-   Consolidate Amazon S3 access Log bucket across the solution. All access log files have a prefix that corresponds to the bucket for which they are generated

## [1.1.0] - 2020-09-29

### Updated

-   S3 storage for inference outputs to use Apache Parquet
-   Add partitioning to AWS Glue tables
-   Update to AWS CDK v1.63.0
-   Update to AWS SDK v2.755.0

## [1.0.0] - 2020-08-28

### Added

-   Initial release
