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

export interface KeyPhraseTableProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase
}

export class KeyPhraseTable extends Construct {
    constructor (scope: Construct, id: string, props: KeyPhraseTableProps) {
        super(scope, id);

        const tweetTable = new Table(this, 'KeyPhrase', {
            database: props.database,
            tableName: 'keyphrase',
            columns: this.entityColumns,
            dataFormat: DataFormat.JSON,
            compressed: false,
            bucket: props.s3InputDataBucket,
            s3Prefix: props.s3BucketPrefix,
            partitionKeys: []
        });
    }

    private get entityColumns(): Column[] {
        return [{
                name: 'account_name',
                type: Schema.STRING
            }, {
                name: 'platform',
                type: Schema.STRING
            }, {
                name: 'search_query',
                type: Schema.STRING
            }, {
                name: 'id_str',
                type: Schema.STRING
            }, {
                name: 'created_at',
                type: Schema.TIMESTAMP
            }, {
                name: 'text',
                type: Schema.STRING
            }, {
                name: 'translated_text',
                type: Schema.STRING
            }, {
                name: 'phrase',
                type: Schema.STRING
            }, {
                name: 'phrase_score',
                type: Schema.DOUBLE
            }, {
                name: 'phrase_begin_offset',
                type: Schema.INTEGER
            }, {
                name: 'phrase_end_offset',
                type: Schema.INTEGER
            }];
    }
}