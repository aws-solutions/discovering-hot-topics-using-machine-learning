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
import * as cdk from '@aws-cdk/core';
import { GenericCfnTable, GenericCfnTableProps } from './generic-table-construct';

export class RedditCommentsTable extends GenericCfnTable {
    constructor(scope: cdk.Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            ...this.coreColumns,
            {
                name: 'text',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'translated_text',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'subreddit_id',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'link_title',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'ups',
                type: glue.Schema.INTEGER.inputString
            },
            {
                name: 'total_awards_received',
                type: glue.Schema.INTEGER.inputString
            },
            {
                name: 'subreddit',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'link_author',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'likes',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'replies',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'id',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'author',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'num_comments',
                type: glue.Schema.INTEGER.inputString
            },
            {
                name: 'parent_id',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'score',
                type: glue.Schema.FLOAT.inputString
            },
            {
                name: 'author_fullname',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'controversiality',
                type: glue.Schema.FLOAT.inputString
            },
            {
                name: 'author_premium',
                type: glue.Schema.BOOLEAN.inputString
            },
            {
                name: 'link_id',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'permalink',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'subreddit_type',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'link_permalink',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'name',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'subreddit_name_prefixed',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'created_utc',
                type: glue.Schema.BIG_INT.inputString
            },
            {
                name: 'link_url',
                type: glue.Schema.STRING.inputString
            }
        ];
    }
}
