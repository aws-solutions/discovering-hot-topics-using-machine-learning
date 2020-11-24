#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { IRuleTarget } from '@aws-cdk/aws-events';
import { Aws, Construct } from '@aws-cdk/core';
import { EventManager, RuleConfig } from './event-manager-construct';

export interface Config {
    readonly source: string [],
    readonly ruleTargets: IRuleTarget[]
}

export interface EventRuleProps {
    readonly configs: Config []
}

export class EventRule extends Construct {
    private eventMgr: EventManager

    constructor(scope: Construct, id: string, props: EventRuleProps) {
        super(scope, id);

        let ruleConfigs: RuleConfig[] = [];

        for (const config of props.configs) {
            ruleConfigs.push({
                eventPattern: {
                    account: [ Aws.ACCOUNT_ID ],
                    region: [ Aws.REGION ],
                    source: config.source
                },
                targets: config.ruleTargets
            })
        }

        this.eventMgr = new EventManager(this, 'EventManager', {
            ruleConfig: ruleConfigs,
            eventBusName: `${scope.node.id}-AppIntegration`
        });
    }

    public get eventManager(): EventManager {
        return this.eventMgr;
    }
}
