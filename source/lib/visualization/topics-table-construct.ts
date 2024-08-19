#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";

export class TopicsTable extends GenericCfnTable {

    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [{
            name: 'job_id',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'job_timestamp',
            type: glue_alpha.Schema.TIMESTAMP.inputString
        }, {
            name: 'term',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'weight',
            type: glue_alpha.Schema.DOUBLE.inputString
        }, {
            name: 'topic',
            type: glue_alpha.Schema.STRING.inputString
        }];
    }
}
