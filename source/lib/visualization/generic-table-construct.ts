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

import { Column, DataFormat, IDatabase, Schema, Table } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';

export interface GenericTableProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase,
    readonly tableName: string
}

export abstract class GenericTable extends Construct {
    private _table: Table;

    constructor (scope: Construct, id: string, props: GenericTableProps) {
        super(scope, id);

        this._table = new Table(this, props.tableName, {
            database: props.database,
            tableName: props.tableName,
            columns: this.getColumns(),
            dataFormat: DataFormat.PARQUET,
            storedAsSubDirectories: true,
            bucket: props.s3InputDataBucket,
            s3Prefix: props.s3BucketPrefix,
            partitionKeys: this.getPartitionKeys()
        });
    }

    protected getPartitionKeys(): Column[] {
        return [{
                name: 'created_at',
                type: Schema.TIMESTAMP
            }]
    }

    protected abstract getColumns(): Column[];


    public get table(): Table {
        return this._table;
    }
}