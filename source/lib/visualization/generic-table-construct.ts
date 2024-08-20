#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue from 'aws-cdk-lib/aws-glue';
import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface GenericCfnTableProps {
    readonly tableName: string;
    readonly database: glue_alpha.IDatabase,
    readonly s3InputDataBucket: s3.Bucket,
    readonly s3BucketPrefix: string,
}

export abstract class GenericCfnTable extends Construct {
    public readonly table: glue.CfnTable;

    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id);

        this.table = new glue.CfnTable(this, `Cfn${props.tableName}`, {
            catalogId: cdk.Aws.ACCOUNT_ID,
            databaseName: props.database.databaseName,
            tableInput: {
                description: `A table created with partition projection for ${props.tableName}`,
                name: props.tableName,
                parameters: {
                    "classification": "parquet",
                    "has_encryped_data": false,
                    "projection.enabled": "TRUE",
                    "projection.created_at.range": "NOW-45DAYS,NOW",
                    "projection.created_at.type": "date",
                    "projection.created_at.format": "yyyy-MM-dd"
                },
                partitionKeys: this.partitionKeys,
                storageDescriptor: {
                    columns: this.getColumns(),
                    compressed: false,
                    inputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
                    location: `${props.s3InputDataBucket.s3UrlForObject(props.s3BucketPrefix)}`,
                    outputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
                    serdeInfo: {
                        serializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
                    },
                    storedAsSubDirectories: true
                },
                tableType: 'EXTERNAL_TABLE',
            }
        });
    }

    protected abstract getColumns(): glue.CfnTable.ColumnProperty[];

    protected get partitionKeys(): glue.CfnTable.ColumnProperty[] {
        return [{
            name: 'created_at',
            type: glue_alpha.Schema.TIMESTAMP.inputString
        }]
    }

    protected get coreColumns() {
        return [{
            name: 'account_name',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'platform',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'search_query',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'id_str',
            type: glue_alpha.Schema.STRING.inputString
        }]
    }
}