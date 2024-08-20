#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import { EventBus, EventPattern, IRuleTarget, Rule } from "aws-cdk-lib/aws-events";
import { Construct } from 'constructs';
export interface RuleConfig {
    readonly eventPattern: EventPattern,
    readonly targets?: IRuleTarget[]
}

export interface EventManagerProps {
    readonly eventBusName: string,
    readonly ruleConfig: RuleConfig [],
}

export class EventManager extends Construct {
    private bus: EventBus;

    constructor(scope: Construct, id: string, props: EventManagerProps) {
        super(scope, id);

        this.bus = new EventBus (scope, 'InferenceEvents', {
            eventBusName: props.eventBusName
        });

        props.ruleConfig.forEach( (config, index) => {
            const eventRule = new Rule(scope, `EventRule-${index}`, {
                eventBus: this.bus,
                enabled: true,
                eventPattern: config.eventPattern
            });

            if (config.targets !== undefined) {
                config.targets.forEach( (target) => {
                    eventRule.addTarget(target);
                });
            }
        });
    }

    public get eventBus(): EventBus {
        return this.bus;
    }
}