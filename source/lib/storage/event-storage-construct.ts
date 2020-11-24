#!/usr/bin/env node
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

import { IDatabase } from "@aws-cdk/aws-glue";
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { CfnDeliveryStream, CfnDeliveryStreamProps } from "@aws-cdk/aws-kinesisfirehose";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { Bucket } from '@aws-cdk/aws-s3';
import { Aws, Construct } from "@aws-cdk/core";
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import { buildLambdaFunction } from '@aws-solutions-constructs/core';

export interface EventStorageProps {
    readonly compressionFormat: string,
    readonly prefix?: string,
    readonly processor?: boolean,
    readonly s3Bucket: Bucket,
    readonly keyArn?: string,

    //below props only required if data format is parquet
    /**
     * Convert data to Apache Parquet format
     */
     readonly convertData?: boolean,

    /**
     * The database name is required if Firehose should convert data to Apache Parquet
     */
    readonly database?: IDatabase,

    /**
     * Table is required to add dependency for Firehose creation
     */
    readonly tableName?: string
}

export class EventStorage extends Construct {

    private readonly _lambda: Function;
    private _firehose: CfnDeliveryStream;

    constructor (scope: Construct, id: string, props: EventStorageProps) {
        super(scope, id);

        // Setup the IAM Role for Kinesis Firehose
        const firehoseRole = new Role(this, 'FirehoseRole', {
            assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
        });

        props.s3Bucket.grantReadWrite(firehoseRole); // add permissions to read/write to S3 bucket

        let firehoseGluePolicy: Policy;
        if (props.convertData && props.tableName !== undefined) {
            firehoseGluePolicy = new Policy(this, 'FirehoseGlueTablePolicy', {
                statements: [ new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [ 'glue:GetTable', 'glue:GetTableVersion', 'glue:GetTableVersions' ],
                    resources: [
                        `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${props.database!.databaseName}/${props.tableName}`,
                        `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${props.database!.databaseName}`,
                        `arn:aws:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`
                    ]
                })]
            })

            firehoseGluePolicy.attachToRole(firehoseRole);
        }

        let firehoseGlueKmsPolicy: Policy;
        if (props.keyArn !== undefined) {
            firehoseGlueKmsPolicy = new Policy(this, 'FirehoseGlueKms', {
                    statements: [ new PolicyStatement({
                    effect: Effect.ALLOW,
                    resources: [ props.keyArn ],
                    actions: [ 'kms:Decrypt' ]
                })]
            });

            firehoseGlueKmsPolicy.attachToRole(firehoseRole);
        }

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
                bucketArn: props.s3Bucket.bucketArn,
                bufferingHints: {
                    intervalInSeconds: 600,
                    sizeInMBs: 64
                },
                compressionFormat: props.compressionFormat,
                roleArn: firehoseRole.roleArn,
                ...(props.prefix && {
                    prefix: `${props?.prefix}created_at=!{timestamp:yyyy-MM-dd}/`,
                    errorOutputPrefix: `${props.prefix}error/!{firehose:random-string}/!{firehose:error-output-type}/created_at=!{timestamp:yyyy-MM-dd}/`
                }),
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
        }

        const firehoseToS3 = new KinesisFirehoseToS3(this, 'KinesisFirehose', {
            kinesisFirehoseProps: defaultKinesisFirehoseProps,
            existingBucketObj: props.s3Bucket
        });

        this._firehose = firehoseToS3.kinesisFirehose;
        this._firehose.node.addDependency(firehoseRole);
        if (props.convertData && props.tableName !== undefined) {
            this._firehose.node.addDependency(firehoseGluePolicy!);
            this._firehose.node.addDependency(firehoseGlueKmsPolicy!);
        }
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