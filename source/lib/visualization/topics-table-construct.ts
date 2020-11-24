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

import { Column, DataFormat, IDatabase, Schema, Table } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';

export interface TopicsTableProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase,
    readonly tableName: string
}

export class TopicsTable extends Construct {
    private _table: Table;

    constructor (scope: Construct, id: string, props: TopicsTableProps) {
        super(scope, id);

        this._table = new Table(this, 'Topics', {
            database: props.database,
            tableName: props.tableName,
            columns: this.topicsColumns,
            dataFormat: DataFormat.PARQUET,
            bucket: props.s3InputDataBucket,
            storedAsSubDirectories: true,
            s3Prefix: props.s3BucketPrefix,
            partitionKeys: [{
                name: 'created_at',
                type: Schema.TIMESTAMP
            }],
        });
    }

    private get topicsColumns(): Column[] {
        return [{
                name: 'job_id',
                type: Schema.STRING
            }, {
                name: 'job_timestamp',
                type: Schema.TIMESTAMP
            }, {
                name: 'term',
                type: Schema.STRING
            }, {
                name: 'weight',
                type: Schema.DOUBLE
            }, {
                name: 'topic',
                type: Schema.STRING
            }];
    }

    public get table(): Table {
        return this._table;
    }
}
