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

import * as glue from '@aws-cdk/aws-glue';
import * as cdk from '@aws-cdk/core';
import { GenericCfnTable, GenericCfnTableProps } from './generic-table-construct';

export class MetdataTable extends GenericCfnTable {
    constructor(scope: cdk.Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [
            {
                name: 'account_name',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'platform',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'parent_id',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'Categories',
                type: glue.Schema.struct([
                    {
                        name: 'MatchedCategories',
                        type: glue.Schema.array(glue.Schema.STRING)
                    }
                    // Could not define schema for 'MatchedDetails' because Key is not constant.
                    // It takes the value of the matched category name
                ]).inputString
            },
            {
                name: 'Channel',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'JobName',
                type: glue.Schema.STRING.inputString
            },
            {
                name: 'Participants',
                type: glue.Schema.array(
                    glue.Schema.struct([
                        {
                            name: 'ParticipantRole',
                            type: glue.Schema.STRING
                        }
                    ])
                ).inputString
            },
            {
                name: 'ConversationCharacteristics',
                type: glue.Schema.struct([
                    {
                        name: 'NonTalkTime',
                        type: glue.Schema.struct([
                            {
                                name: 'Instances',
                                type: glue.Schema.array(
                                    glue.Schema.struct([
                                        {
                                            name: 'BeginOffsetMillis',
                                            type: glue.Schema.BIG_INT
                                        },
                                        {
                                            name: 'DurationMillis',
                                            type: glue.Schema.BIG_INT
                                        },
                                        {
                                            name: 'EndOffsetMillis',
                                            type: glue.Schema.BIG_INT
                                        }
                                    ])
                                )
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue.Schema.BIG_INT
                            }
                        ])
                    },
                    {
                        name: 'Interruptions',
                        type: glue.Schema.struct([
                            {
                                name: 'TotalCount',
                                type: glue.Schema.INTEGER
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue.Schema.BIG_INT
                            },
                            {
                                name: 'InterruptionsByInterrupter',
                                type: glue.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue.Schema.array(
                                            glue.Schema.struct([
                                                {
                                                    name: 'BeginOffsetMillis',
                                                    type: glue.Schema.BIG_INT
                                                },
                                                {
                                                    name: 'DurationMillis',
                                                    type: glue.Schema.BIG_INT
                                                },
                                                {
                                                    name: 'EndOffsetMillis',
                                                    type: glue.Schema.BIG_INT
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
                        type: glue.Schema.BIG_INT
                    },
                    {
                        name: 'Sentiment',
                        type: glue.Schema.struct([
                            {
                                name: 'OverallSentiment',
                                type: glue.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue.Schema.FLOAT
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue.Schema.FLOAT
                                    }
                                ])
                            },
                            {
                                name: 'SentimentByPeriod',
                                type: glue.Schema.struct([
                                    {
                                        name: 'QUARTER',
                                        type: glue.Schema.struct([
                                            {
                                                name: 'AGENT',
                                                type: glue.Schema.array(
                                                    glue.Schema.struct([
                                                        {
                                                            name: 'Score',
                                                            type: glue.Schema.FLOAT
                                                        },
                                                        {
                                                            name: 'BeginOffsetMillis',
                                                            type: glue.Schema.BIG_INT
                                                        },
                                                        {
                                                            name: 'EndOffsetMillis',
                                                            type: glue.Schema.BIG_INT
                                                        }
                                                    ])
                                                )
                                            },
                                            {
                                                name: 'CUSTOMER',
                                                type: glue.Schema.array(
                                                    glue.Schema.struct([
                                                        {
                                                            name: 'Score',
                                                            type: glue.Schema.FLOAT
                                                        },
                                                        {
                                                            name: 'BeginOffsetMillis',
                                                            type: glue.Schema.BIG_INT
                                                        },
                                                        {
                                                            name: 'EndOffsetMillis',
                                                            type: glue.Schema.BIG_INT
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
                        type: glue.Schema.struct([
                            {
                                name: 'DetailsByParticipant',
                                type: glue.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue.Schema.struct([
                                            {
                                                name: 'AverageWordsPerMinute',
                                                type: glue.Schema.INTEGER
                                            }
                                        ])
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue.Schema.struct([
                                            {
                                                name: 'AverageWordsPerMinute',
                                                type: glue.Schema.INTEGER
                                            }
                                        ])
                                    }
                                ])
                            }
                        ])
                    },
                    {
                        name: 'TalkTime',
                        type: glue.Schema.struct([
                            {
                                name: 'DetailsByParticipant',
                                type: glue.Schema.struct([
                                    {
                                        name: 'AGENT',
                                        type: glue.Schema.struct([
                                            {
                                                name: 'TotalTimeMillis',
                                                type: glue.Schema.BIG_INT
                                            }
                                        ])
                                    },
                                    {
                                        name: 'CUSTOMER',
                                        type: glue.Schema.struct([
                                            {
                                                name: 'TotalTimeMillis',
                                                type: glue.Schema.BIG_INT
                                            }
                                        ])
                                    }
                                ])
                            },
                            {
                                name: 'TotalTimeMillis',
                                type: glue.Schema.BIG_INT
                            }
                        ])
                    }
                ]).inputString
            },
            {
                name: 'ContentMetadata',
                type: glue.Schema.struct([
                    {
                        name: 'Output',
                        type: glue.Schema.STRING
                    }
                ]).inputString
            }
        ];
    }
}
