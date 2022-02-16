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
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";


export class NewsFeedTable extends GenericCfnTable {
    constructor(scope: cdk.Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [{
            name: 'account_name',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'platform',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'search_query',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'entities',
            type: glue.Schema.struct([{
                name: 'urls',
                type: glue.Schema.array(glue.Schema.struct([{
                    name: 'expanded_url',
                    type: glue.Schema.STRING
                }]))
            }, {
                name: 'media',
                type: glue.Schema.array(glue.Schema.struct([{
                    name: 'media_url',
                    type: glue.Schema.STRING
                }]))
            }]).inputString
        }, {
            name: 'metadata',
            type: glue.Schema.struct([{
                name: 'website',
                type: glue.Schema.STRING
            }, {
                name: 'country',
                type: glue.Schema.STRING
            }, {
                name: 'topic',
                type: glue.Schema.STRING
            }]).inputString
        }, {
            name: 'lang',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'id_str',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'text',
            type: glue.Schema.STRING.inputString
        }, {
            name: 'translated_text',
            type: glue.Schema.STRING.inputString
        }]
    }
}