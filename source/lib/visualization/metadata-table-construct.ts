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

export class MetdataTable extends GenericCfnTable {
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
                name: 'parent_id',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'Categories',
                type: glue_alpha.Schema.struct([
                    {
                        name: 'MatchedCategories',
                        type: glue_alpha.Schema.array(glue_alpha.Schema.STRING)
                    }
                    // Could not define schema for 'MatchedDetails' because Key is not constant.
                    // It takes the value of the matched category name
                ]).inputString
            },
            {
                name: 'Channel',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'JobName',
                type: glue_alpha.Schema.STRING.inputString
            },
            {
                name: 'Participants',
                type: glue_alpha.Schema.array(
                    glue_alpha.Schema.struct([
                        {
                            name: 'ParticipantRole',
                            type: glue_alpha.Schema.STRING
                        }
                    ])
                ).inputString
            },
            {
                name: 'ConversationCharacteristics',
                type: glue_alpha.Schema.struct([
                    {
                        name: 'NonTalkTime',
                        type: glue_alpha.Schema.struct([
                            {
                                name: 'Instances',
                                type: glue_alpha.Schema.array(
                                    glue_alpha.Schema.struct([
                                        {
                                            name: 'BeginOffsetMillis',
                                            type: glue_alpha.Schema.BIG_INT
                                        },
                                        {
                                            name: 'DurationMillis',
                                            type: glue_alpha.Schema.BIG_INT
                                        },
                                        {
                                            name: 'EndOffsetMillis',
                                            type: glue_alpha.Schema.BIG_INT
                                        }
                                    ])
                                )
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue_alpha.Schema.BIG_INT
                            }
                        ])
                    },
                    {
                        name: 'Interruptions',
                        type: glue_alpha.Schema.struct([
                            {
                                name: 'TotalCount',
                                type: glue_alpha.Schema.INTEGER
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue_alpha.Schema.BIG_INT
                            },
                            {
                                name: 'InterruptionsByInterrupter',
                                type: glue_alpha.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue_alpha.Schema.array(
                                            glue_alpha.Schema.struct([
                                                {
                                                    name: 'BeginOffsetMillis',
                                                    type: glue_alpha.Schema.BIG_INT
                                                },
                                                {
                                                    name: 'DurationMillis',
                                                    type: glue_alpha.Schema.BIG_INT
                                                },
                                                {
                                                    name: 'EndOffsetMillis',
                                                    type: glue_alpha.Schema.BIG_INT
                                                }
                                            ])
                                        )
                                    }
                                ])
                            }
                        ])
                    },
                    {
                        name: 'TotalConversationDurationMillis',
                        type: glue_alpha.Schema.BIG_INT
                    },
                    {
                        name: 'Sentiment',
                        type: glue_alpha.Schema.struct([
                            {
                                name: 'OverallSentiment',
                                type: glue_alpha.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue_alpha.Schema.FLOAT
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue_alpha.Schema.FLOAT
                                    }
                                ])
                            },
                            {
                                name: 'SentimentByPeriod',
                                type: glue_alpha.Schema.struct([
                                    {
                                        name: 'QUARTER',
                                        type: glue_alpha.Schema.struct([
                                            {
                                                name: 'AGENT',
                                                type: glue_alpha.Schema.array(
                                                    glue_alpha.Schema.struct([
                                                        {
                                                            name: 'Score',
                                                            type: glue_alpha.Schema.FLOAT
                                                        },
                                                        {
                                                            name: 'BeginOffsetMillis',
                                                            type: glue_alpha.Schema.BIG_INT
                                                        },
                                                        {
                                                            name: 'EndOffsetMillis',
                                                            type: glue_alpha.Schema.BIG_INT
                                                        }
                                                    ])
                                                )
                                            },
                                            {
                                                name: 'CUSTOMER',
                                                type: glue_alpha.Schema.array(
                                                    glue_alpha.Schema.struct([
                                                        {
                                                            name: 'Score',
                                                            type: glue_alpha.Schema.FLOAT
                                                        },
                                                        {
                                                            name: 'BeginOffsetMillis',
                                                            type: glue_alpha.Schema.BIG_INT
                                                        },
                                                        {
                                                            name: 'EndOffsetMillis',
                                                            type: glue_alpha.Schema.BIG_INT
                                                        }
                                                    ])
                                                )
                                            }
                                        ])
                                    }
                                ])
                            }
                        ])
                    },
                    {
                        name: 'TalkSpeed',
                        type: glue_alpha.Schema.struct([
                            {
                                name: 'DetailsByParticipant',
                                type: glue_alpha.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue_alpha.Schema.struct([
                                            {
                                                name: 'AverageWordsPerMinute',
                                                type: glue_alpha.Schema.INTEGER
                                            }
                                        ])
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue_alpha.Schema.struct([
                                            {
                                                name: 'AverageWordsPerMinute',
                                                type: glue_alpha.Schema.INTEGER
                                            }
                                        ])
                                    }
                                ])
                            }
                        ])
                    },
                    {
                        name: 'TalkTime',
                        type: glue_alpha.Schema.struct([
                            {
                                name: 'DetailsByParticipant',
                                type: glue_alpha.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue_alpha.Schema.struct([
                                            {
                                                name: 'TotalTimeMillis',
                                                type: glue_alpha.Schema.BIG_INT
                                            }
                                        ])
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue_alpha.Schema.struct([
                                            {
                                                name: 'TotalTimeMillis',
                                                type: glue_alpha.Schema.BIG_INT
                                            }
                                        ])
                                    }
                                ])
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue_alpha.Schema.BIG_INT
                            }
                        ])
                    }
                ]).inputString
            },
            {
                name: 'ContentMetadata',
                type: glue_alpha.Schema.struct([
                    {
                        name: 'Output',
                        type: glue_alpha.Schema.STRING
                    }
                ]).inputString
            }
        ];
    }
}
