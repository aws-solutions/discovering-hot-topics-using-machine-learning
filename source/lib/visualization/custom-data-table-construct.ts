/**********************************************************************************************************************
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
import { GenericCfnTable, GenericCfnTableProps } from './generic-table-construct';

/**
 * Normalizing the data structure of the JSON object to a relational form and remove arrays since arrays
 * as a datatype is not supported by Amazon QuickSight.
 */
export class CustomDataTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            {
                name: 'account_name',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'platform',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'id_str',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'parent_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'text',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'lang',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: '_translated_text',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: '_cleansed_text',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'source_file',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'Id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'BeginOffsetMillis',
                type: glue_alpha.Schema.BIG_INT.inputString
            },
            {
                name: 'EndOffsetMillis',
                type: glue_alpha.Schema.BIG_INT.inputString
            },
            {
                name: 'Sentiment',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'ParticipantRole',
                type: glue_alpha.Schema.STRING.inputString
            }
        ];
    }
}

export class LoudnessScoreTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            {
                name: 'score',
                type: glue_alpha.Schema.FLOAT.inputString
            },
            {
                name: 'account_name',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'platform',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'id_str',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'parent_id',
                type: glue_alpha.Schema.STRING.inputString
            }
        ];
    }
}

export class ItemTable extends GenericCfnTable {
    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            {
                name: 'account_name',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'platform',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'id_str',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'parent_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'Type',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'Confidence',
                type: glue_alpha.Schema.FLOAT.inputString
            },
            {
                name: 'Content',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'BeginOffsetMillis',
                type: glue_alpha.Schema.BIG_INT.inputString
            },
            {
                name: 'EndOffsetMillis',
                type: glue_alpha.Schema.BIG_INT.inputString
            }
        ];
    }
}
