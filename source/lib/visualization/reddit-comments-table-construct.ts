#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from './generic-table-construct';

export class RedditCommentsTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            ...this.coreColumns,
            {
                name: 'text',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'translated_text',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'subreddit_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'link_title',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'ups',
                type: glue_alpha.Schema.INTEGER.inputString
            },
            {
                name: 'total_awards_received',
                type: glue_alpha.Schema.INTEGER.inputString
            },
            {
                name: 'subreddit',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'link_author',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'likes',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'replies',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'author',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'num_comments',
                type: glue_alpha.Schema.INTEGER.inputString
            },
            {
                name: 'parent_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'score',
                type: glue_alpha.Schema.FLOAT.inputString
            },
            {
                name: 'author_fullname',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'controversiality',
                type: glue_alpha.Schema.FLOAT.inputString
            },
            {
                name: 'author_premium',
                type: glue_alpha.Schema.BOOLEAN.inputString
            },
            {
                name: 'link_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'permalink',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'subreddit_type',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'link_permalink',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'name',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'subreddit_name_prefixed',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'created_utc',
                type: glue_alpha.Schema.BIG_INT.inputString
            },
            {
                name: 'link_url',
                type: glue_alpha.Schema.STRING.inputString
            }
        ];
    }
}
