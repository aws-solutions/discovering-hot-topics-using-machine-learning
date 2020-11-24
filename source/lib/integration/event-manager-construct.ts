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

import { EventBus, EventPattern, IRuleTarget, Rule } from "@aws-cdk/aws-events";
import { Construct } from "@aws-cdk/core";
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