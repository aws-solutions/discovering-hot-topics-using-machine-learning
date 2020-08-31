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

export interface TextInImgSentimentTableProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase
}

export class TextInImgSentimentTable extends Construct {
    constructor (scope: Construct, id: string, props: TextInImgSentimentTableProps) {
        super(scope, id);

        const tweetTable = new Table(this, 'ImgTxtSentiment', {
            database: props.database,
            tableName: 'img_text_sentiment',
            columns: this.sentimentColumns,
            dataFormat: DataFormat.JSON,
            compressed: false,
            bucket: props.s3InputDataBucket,
            s3Prefix: props.s3BucketPrefix,
            partitionKeys: [],
        });
    }

    private get sentimentColumns(): Column[] {
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
                name: 'sentiment',
                type: Schema.STRING
            }, {
                name: 'sentimentposscore',
                type: Schema.DOUBLE
            }, {
                name: 'sentimentnegscore',
                type: Schema.DOUBLE
            }, {
                name: 'sentimentneuscore',
                type: Schema.DOUBLE
            }, {
                name: 'sentimentmixscore',
                type: Schema.DOUBLE
            }, {
                name: 'image_url',
                type: Schema.STRING
            }];
    }
}