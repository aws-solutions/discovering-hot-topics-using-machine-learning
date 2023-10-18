#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface EventStorageProps {
    readonly compressionFormat: string;
    /**
     * Should the delivery stream enable dynamic partitioning. If the value is set to true, then either
     * @aggregatebyDay should be set to 'true' or @prefix property should be provided to prefix S3 bucket
     */
    readonly enableDynamicPartitioning?: boolean;
    /**
     * Prefix for S3 bucket, all data will be stored with the provided prefix
     */
    readonly prefix?: string;
    /**
     * If this property is set, it will create a prefix 'created_at=YYYY-MM-DD' for records stored in S3.
     * This property is used in conjunction with the prefix. If the prefix is not set, this property is ignored
     */
    readonly aggregateByDay?: boolean;
    /**
     * Lambda process if any tranformation is required
     */
    readonly processor?: boolean;
    /**
     * S3 bucket location where data will be stored
     */
    readonly s3Bucket: s3.Bucket;
    /**
     * The KMS key ARN for Glue Tables
     */
    readonly keyArn?: string;

    //below props only required if data format is parquet
    /**
     * Convert data to Apache Parquet format
     */
    readonly convertData?: boolean;

    /**
     * The database name is required if Firehose should convert data to Apache Parquet
     */
    readonly database?: glue_alpha.IDatabase;

    /**
     * Table is required to add dependency for Firehose creation
     */
    readonly tableName?: string;
}

export class EventStorage extends Construct {
    private readonly _lambda: lambda.Function;
    private _firehose: firehose.CfnDeliveryStream;

    constructor(scope: Construct, id: string, props: EventStorageProps) {
        super(scope, id);

        // Setup the IAM Role for Kinesis Firehose
        const firehoseRole = new iam.Role(this, 'FirehoseRole', {
            assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com')
        });

        props.s3Bucket.grantReadWrite(firehoseRole); // add permissions to read/write to S3 bucket

        let firehoseGluePolicy: iam.Policy;
        if (props.convertData && props.tableName !== undefined) {
            firehoseGluePolicy = new iam.Policy(this, 'FirehoseGlueTablePolicy', {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['glue:GetTable', 'glue:GetTableVersion', 'glue:GetTableVersions'],
                        resources: [
                            `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${
                                props.database!.databaseName
                            }/${props.tableName}`,
                            `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${
                                props.database!.databaseName
                            }`,
                            `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:catalog`
                        ]
                    })
                ]
            });

            firehoseGluePolicy.attachToRole(firehoseRole);
        }

        let firehoseGlueKmsPolicy: iam.Policy;
        if (props.keyArn !== undefined) {
            firehoseGlueKmsPolicy = new iam.Policy(this, 'FirehoseGlueKms', {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        resources: [props.keyArn],
                        actions: ['kms:Decrypt']
                    })
                ]
            });

            firehoseGlueKmsPolicy.attachToRole(firehoseRole);
        }

        let processingConfiguration = undefined;
        if (props?.processor) {
            if (props.enableDynamicPartitioning) {
                processingConfiguration = {
                    processingConfiguration: {
                        enabled: true,
                        processors: [
                            {
                                type: 'MetadataExtraction',
                                parameters: [
                                    {
                                        parameterName: 'MetadataExtractionQuery',
                                        parameterValue:
                                            '{created_at: .created_at | strptime("%Y-%m-%d %H:%M:%S") | strftime("%Y-%m-%d")}'
                                    },
                                    {
                                        parameterName: 'JsonParsingEngine',
                                        parameterValue: 'JQ-1.6'
                                    }
                                ]
                            }
                        ]
                    }
                };
            } else {
                this._lambda = buildLambdaFunction(this, {
                    lambdaFunctionProps: {
                        runtime: lambda.Runtime.NODEJS_18_X,
                        handler: 'index.handler',
                        code: lambda.Code.fromAsset(`${__dirname}/../../lambda/storage-firehose-processor`)
                    }
                });

                const lambdaProcessorPolicy = new iam.Policy(this, 'LambdaProcessor', {
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            resources: [this._lambda.functionArn],
                            actions: ['lambda:InvokeFunction', 'lambda:GetFunctionConfiguration']
                        })
                    ]
                });

                lambdaProcessorPolicy.attachToRole(firehoseRole);
                processingConfiguration = {
                    processingConfiguration: {
                        enabled: true,
                        processors: [
                            {
                                type: 'Lambda',
                                parameters: [
                                    {
                                        parameterName: 'LambdaArn',
                                        parameterValue: this._lambda.functionArn
                                    }
                                ]
                            }
                        ]
                    }
                };
            }
        }

        let bucketPrefix = undefined;
        let dynamicPartitioningConfiguration = undefined;
        if (props.prefix) {
            bucketPrefix = this.getBucketPrefix(props);
            if (props.enableDynamicPartitioning) {
                dynamicPartitioningConfiguration = {
                    dynamicPartitioningConfiguration: {
                        enabled: true,
                        retryOptions: {
                            durationInSeconds: 300
                        }
                    }
                };
            }
        }

        // Setup the default Kinesis Firehose props
        const defaultKinesisFirehoseProps: firehose.CfnDeliveryStreamProps = {
            deliveryStreamType: 'DirectPut',
            deliveryStreamEncryptionConfigurationInput: {
                keyType: 'AWS_OWNED_CMK'
            },
            extendedS3DestinationConfiguration: {
                bucketArn: props.s3Bucket.bucketArn,
                bufferingHints: {
                    intervalInSeconds: 600,
                    sizeInMBs: 128
                },
                compressionFormat: props.compressionFormat,
                roleArn: firehoseRole.roleArn,
                ...dynamicPartitioningConfiguration,
                ...bucketPrefix,
                ...processingConfiguration,
                ...(props.convertData && {
                    dataFormatConversionConfiguration: {
                        inputFormatConfiguration: {
                            deserializer: {
                                openXJsonSerDe: {}
                            }
                        },
                        outputFormatConfiguration: {
                            serializer: {
                                parquetSerDe: {}
                            }
                        },
                        schemaConfiguration: {
                            databaseName: props.database!.databaseName,
                            tableName: props.tableName,
                            roleArn: firehoseRole.roleArn
                        }
                    }
                })
            }
        };

        const firehoseToS3 = new KinesisFirehoseToS3(this, 'KinesisFirehose', {
            kinesisFirehoseProps: defaultKinesisFirehoseProps,
            existingBucketObj: props.s3Bucket
        });

        this._firehose = firehoseToS3.kinesisFirehose;
        this._firehose.node.addDependency(firehoseRole);
        if (props.convertData && props.tableName !== undefined) {
            this._firehose.node.addDependency(firehoseGluePolicy!);
            if (props.keyArn != undefined) {
                this._firehose.node.addDependency(firehoseGlueKmsPolicy!);
            }
        }
    }

    public getBucketPrefix(props: EventStorageProps) {
        let bucketPrefix = undefined;
        if (props.aggregateByDay) {
            bucketPrefix = {
                // updating error prefix and moving it outside the table to avoid the crawler
                // crawling the error prefix
                errorOutputPrefix: `error/${props.prefix}!{firehose:random-string}/!{firehose:error-output-type}/created_at=!{timestamp:yyyy-MM-dd}/`,
                prefix: `${props.prefix}created_at=!{partitionKeyFromQuery:created_at}/`
            };
        } else {
            bucketPrefix = {
                prefix: props.prefix
            };
        }
        return bucketPrefix;
    }

    public get kinesisFirehose(): firehose.CfnDeliveryStream {
        return this._firehose;
    }

    public get deliveryStreamName(): string {
        return this.kinesisFirehose.ref;
    }

    public get deliveryStreamArn(): string {
        return this.kinesisFirehose.attrArn;
    }
}
