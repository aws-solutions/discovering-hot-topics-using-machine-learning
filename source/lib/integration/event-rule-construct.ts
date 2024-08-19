#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { IRuleTarget } from 'aws-cdk-lib/aws-events';
import { Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';
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
