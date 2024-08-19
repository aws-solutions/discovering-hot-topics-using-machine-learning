#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";


export class NewsFeedTable extends GenericCfnTable {
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
            name: 'search_query',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'entities',
            type: glue_alpha.Schema.struct([{
                name: 'urls',
                type: glue_alpha.Schema.array(glue_alpha.Schema.struct([{
                    name: 'expanded_url',
                    type: glue_alpha.Schema.STRING
                }]))
            }, {
                name: 'media',
                type: glue_alpha.Schema.array(glue_alpha.Schema.struct([{
                    name: 'media_url',
                    type: glue_alpha.Schema.STRING
                }]))
            }]).inputString
        }, {
            name: 'metadata',
            type: glue_alpha.Schema.struct([{
                name: 'website',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'country',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'topic',
                type: glue_alpha.Schema.STRING
            }]).inputString
        }, {
            name: 'lang',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'id_str',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'text',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'translated_text',
            type: glue_alpha.Schema.STRING.inputString
        }]
    }
}