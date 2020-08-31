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

import { Table, DataFormat, Column, Schema, IDatabase } from '@aws-cdk/aws-glue';
import { Construct } from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';

export interface TopicMappingsProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase
}

export class TopicMappingsTable extends Construct {
    constructor (scope: Construct, id: string, props: TopicMappingsProps) {
        super(scope, id);

        const tweetTable = new Table(this, 'Topics', {
            database: props.database,
            tableName: 'topic_mappings',
            columns: this.topicMappingsColumns,
            dataFormat: DataFormat.JSON,
            compressed: false,
            bucket: props.s3InputDataBucket,
            s3Prefix: props.s3BucketPrefix,
            partitionKeys: [],
        });
    }

    private get topicMappingsColumns(): Column[] {
        return [{
                name: 'job_id',
                type: Schema.STRING
            }, {
                name: 'job_timestamp',
                type: Schema.TIMESTAMP
            }, {
                name: 'topic',
                type: Schema.STRING
            }, {
                name: 'id_str',
                type: Schema.STRING
            }];
    }
}