#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue from 'aws-cdk-lib/aws-glue';
import * as glue_alpha  from '@aws-cdk/aws-glue-alpha';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";

export class EntityTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            ...this.coreColumns, {
                name: 'text',
                type: glue_alpha.Schema.STRING.inputString
            }, {
                name: 'translated_text',
                type: glue_alpha.Schema.STRING.inputString
            }, {
                name: 'entity_text',
                type: glue_alpha.Schema.STRING.inputString
            }, {
                name: 'entity_type',
                type: glue_alpha.Schema.STRING.inputString
            }, {
                name: 'entity_score',
                type: glue_alpha.Schema.DOUBLE.inputString
            }, {
                name: 'entity_begin_offset',
                type: glue_alpha.Schema.INTEGER.inputString
            }, {
                name: 'entity_end_offset',
                type: glue_alpha.Schema.INTEGER.inputString
            }];
    }
}
