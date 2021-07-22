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

import { Column, Schema } from '@aws-cdk/aws-glue';
import { Construct } from '@aws-cdk/core';
import { GenericTable, GenericTableProps } from './generic-table-construct';

export class TextInImgSentimentTable extends GenericTable {

    constructor (scope: Construct, id: string, props: GenericTableProps) {
        super(scope, id, props);

    }

    protected getColumns(): Column[] {
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
