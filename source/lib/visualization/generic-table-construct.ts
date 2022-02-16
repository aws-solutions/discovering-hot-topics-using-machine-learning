#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

import * as glue from '@aws-cdk/aws-glue';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

export interface GenericCfnTableProps {
    readonly tableName: string;
    readonly database: glue.IDatabase,
    readonly s3InputDataBucket: s3.Bucket,
    readonly s3BucketPrefix: string,
}

export abstract class GenericCfnTable extends cdk.Construct {
    public readonly table: glue.CfnTable;

    constructor(scope: cdk.Construct, id: string, props: GenericCfnTableProps) {
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
            type: glue.Schema.TIMESTAMP.inputString
        }]
    }

    protected get coreColumns() {
        return [{
            name: 'account_name',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'platform',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'search_query',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'id_str',
            type: glue.Schema.STRING.inputString
        }]
    }
}