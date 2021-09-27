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

import * as glue from "@aws-cdk/aws-glue";
import { Construct } from "@aws-cdk/core";
import { GenericTable, GenericTableProps } from "./generic-table-construct";

 export class YoutubeCommentsTable extends GenericTable {
    constructor(scope: Construct, id: string, props: GenericTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.Column[] {
        return [{
            name: 'account_name',
            type: glue.Schema.STRING
        }, {
            name: 'platform',
            type: glue.Schema.STRING
        }, {
            name: 'id_str',
            type: glue.Schema.STRING
        }, {
            name: 'video_id',
            type: glue.Schema.STRING
        }, {
            name: 'title',
            type: glue.Schema.STRING
        }, {
            name: 'text',
            type: glue.Schema.STRING
        }, {
            name: 'parent_id',
            type: glue.Schema.STRING
        }, {
            name: 'viewer_rating',
            type: glue.Schema.STRING
        }, {
            name: 'like_count',
            type: glue.Schema.INTEGER
        }, {
            name: 'updated_at',
            type: glue.Schema.TIMESTAMP
        }, {
            name: 'search_query',
            type: glue.Schema.STRING
        }, {
            name: 'lang',
            type: glue.Schema.STRING
        }, {
            name: '_translated_text',
            type: glue.Schema.STRING
        }, {
            name: '_cleansed_text',
            type: glue.Schema.STRING
        }];
    }
}