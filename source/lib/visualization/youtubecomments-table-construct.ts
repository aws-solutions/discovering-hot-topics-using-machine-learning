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