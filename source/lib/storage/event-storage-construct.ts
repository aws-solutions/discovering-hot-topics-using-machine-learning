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

import { Construct, Aws } from "@aws-cdk/core";
import { Bucket, CfnBucket } from '@aws-cdk/aws-s3';
import { CfnDeliveryStream, CfnDeliveryStreamProps } from "@aws-cdk/aws-kinesisfirehose";
import { buildLambdaFunction, buildS3Bucket, DefaultLogGroupProps } from '@aws-solutions-constructs/core';
import { Runtime, Code, Function } from "@aws-cdk/aws-lambda";
import { Role, ServicePrincipal, PolicyStatement, Policy, Effect } from "@aws-cdk/aws-iam";
import { LogGroup } from "@aws-cdk/aws-logs";

export interface EventStorageProps {
    readonly compressionFormat: string,
    readonly prefix?: string,
    readonly processor?: boolean,
    readonly s3Bucket?: Bucket
}
export class EventStorage extends Construct {

    private readonly _lambda: Function;
    private _firehose: CfnDeliveryStream;
    private _s3Bucket: Bucket;
    private _s3LoggingBucket?: Bucket

    constructor (scope: Construct, id: string, props: EventStorageProps) {
        super(scope, id);

        // Setup Cloudwatch Log group & stream for Kinesis Firehose
        const cwLogGroup = new LogGroup(this, 'firehose-log-group', DefaultLogGroupProps());
        const cwLogStream = cwLogGroup.addStream('firehose-log-stream');

        // Setup the IAM Role for Kinesis Firehose
        const firehoseRole = new Role(this, 'FirehoseRole', {
            assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
        });

        if ( props.s3Bucket === undefined ) {
            // Setup S3 Bucket
            [ this._s3Bucket, this._s3LoggingBucket ] = buildS3Bucket(this, {
                bucketProps: {
                    versioned: false
                }
            });

            (this._s3LoggingBucket?.node.defaultChild as CfnBucket).addPropertyDeletionOverride('VersioningConfiguration');

            // Extract the CfnBucket from the s3Bucket
            const s3BucketResource = this._s3Bucket.node.defaultChild as CfnBucket;

            s3BucketResource.cfnOptions.metadata = {
                cfn_nag: {
                    rules_to_suppress: [{
                        id: 'W51',
                        reason: `This S3 bucket Bucket does not need a bucket policy. The access to the bucket is restricted to Kinesis Fireshose using IAM Role policy`
                    }]
                }
            };
        } else {
            this._s3Bucket = props.s3Bucket;
        }

        this._s3Bucket.grantReadWrite(firehoseRole); // add permissions to read/write to S3 bucket

        // Setup the IAM policy for Kinesis Firehose
        const firehosePolicy = new Policy(this, 'FirehosePolicy', {
            statements: [ new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'logs:PutLogEvents'
                ],
                resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${cwLogGroup.logGroupName}:log-stream:${cwLogStream.logStreamName}`]
            })]
        });

        // Attach policy to role
        firehosePolicy.attachToRole(firehoseRole);

        if (props?.processor) {
            this._lambda = buildLambdaFunction(this, {
                lambdaFunctionProps: {
                    runtime: Runtime.NODEJS_12_X,
                    handler: 'index.handler',
                    code: Code.fromAsset(`${__dirname}/../../lambda/storage-firehose-processor`),
                }
            });

            const lambdaProcessorPolicy = new Policy(this, 'LambdaProcessor', {
                statements: [new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ this._lambda.functionArn ],
                    actions: [ "lambda:InvokeFunction", "lambda:GetFunctionConfiguration"  ]
                })]
            });

            lambdaProcessorPolicy.attachToRole(firehoseRole);
        }

        // Setup the default Kinesis Firehose props
        const defaultKinesisFirehoseProps: CfnDeliveryStreamProps = {
            extendedS3DestinationConfiguration : {
                bucketArn: this._s3Bucket.bucketArn,
                bufferingHints: {
                    intervalInSeconds: 300,
                    sizeInMBs: 5
                },
                compressionFormat: props.compressionFormat,
                roleArn: firehoseRole.roleArn,
                cloudWatchLoggingOptions: {
                    enabled: true,
                    logGroupName: cwLogGroup.logGroupName,
                    logStreamName: cwLogStream.logStreamName
                },
                prefix: props?.prefix,
                ...(props?.processor && {
                        processingConfiguration: {
                        enabled: true,
                        processors: [{
                            type: 'Lambda',
                            parameters: [{
                                parameterName: 'LambdaArn',
                                parameterValue: this._lambda.functionArn
                            }]
                        }]
                    }
                }),
                //TODO - conversion for record format to parquet - https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html
                // TODO - additional permissions required for changing the format when writing for glue tables
                // {
                //     "Effect": "Allow",
                //     "Action": [
                //       "glue:GetTable",
                //       "glue:GetTableVersion",
                //       "glue:GetTableVersions"
                //     ],
                //     "Resource": "table-arn"
                // }
            }
        }


        // Override with the input props
        this._firehose = new CfnDeliveryStream(this, 'KinesisFirehose', defaultKinesisFirehoseProps);
    }

    public get s3Bucket(): Bucket {
        return this._s3Bucket;
    }

    public get kinesisFirehose(): CfnDeliveryStream {
        return this._firehose;
    }

    public get deliveryStreamName(): string {
        return this.kinesisFirehose.ref
    }

    public get deliveryStreamArn(): string {
        return this.kinesisFirehose.attrArn;
    }
}