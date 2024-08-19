/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";

export class YoutubeCommentsTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [{
            name: 'account_name',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'platform',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'id_str',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'video_id',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'title',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'text',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'parent_id',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'viewer_rating',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'like_count',
            type: glue_alpha.Schema.INTEGER.inputString
        }, {
            name: 'updated_at',
            type: glue_alpha.Schema.TIMESTAMP.inputString
        }, {
            name: 'search_query',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'lang',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: '_translated_text',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: '_cleansed_text',
            type: glue_alpha.Schema.STRING.inputString
        }];
    }
}