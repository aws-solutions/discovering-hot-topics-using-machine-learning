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
import { Bucket } from '@aws-cdk/aws-s3';
import { CfnDeliveryStream, CfnDeliveryStreamProps } from "@aws-cdk/aws-kinesisfirehose";
import { buildLambdaFunction, DefaultLogGroupProps } from '@aws-solutions-constructs/core';
import { Runtime, Code, Function } from "@aws-cdk/aws-lambda";
import { Role, ServicePrincipal, PolicyStatement, Policy, Effect } from "@aws-cdk/aws-iam";
import { LogGroup } from "@aws-cdk/aws-logs";
import { IDatabase } from "@aws-cdk/aws-glue";

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

        // Setup Cloudwatch Log group & stream for Kinesis Firehose
        const cwLogGroup = new LogGroup(this, 'firehose-log-group', DefaultLogGroupProps());
        const cwLogStream = cwLogGroup.addStream('firehose-log-stream');

        // Setup the IAM Role for Kinesis Firehose
        const firehoseRole = new Role(this, 'FirehoseRole', {
            assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
        });

        props.s3Bucket.grantReadWrite(firehoseRole); // add permissions to read/write to S3 bucket

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

        if (props.keyArn !== undefined) {
            const firehoseGlueKmsPolicy = new Policy(this, 'FirehoseGlueKms', {
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
                cloudWatchLoggingOptions: {
                    enabled: true,
                    logGroupName: cwLogGroup.logGroupName,
                    logStreamName: cwLogStream.logStreamName
                },
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


        // Override with the input props
        this._firehose = new CfnDeliveryStream(this, 'KinesisFirehose', defaultKinesisFirehoseProps);
        if (props.convertData && props.tableName !== undefined) {
            this._firehose.node.addDependency(firehoseGluePolicy!);
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
