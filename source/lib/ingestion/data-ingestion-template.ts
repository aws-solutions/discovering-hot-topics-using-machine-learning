#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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


import * as ddb from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { EventsRuleToLambda } from '@aws-solutions-constructs/aws-events-rule-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import * as defaults from '@aws-solutions-constructs/core';

export interface LambdaAndDynamoDBProps {
    /**
     * Properties for the lambda function that triggers the event containing config information
     * for the resource target to process
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps;
    /**
     * User provided instance of the lambda function that triggers the event containing config
     * information for the resource target to process. If this property is set, @functionProps
     * is ignored
     */
    readonly existingLambda?: lambda.Function
    /**
     * Properties for the dynamoDB table that contains config information for the lambda functions
     * to use. The table is not a requirement for creating the construct. If @tableProps and
     * @existingTable are not set, the table is not created
     */
    readonly tableProps?: ddb.TableProps;
    /**
     * User provided instance of instance of the DyanamoDB table, if this is set, the properties
     * provided in @tableProps is ignored. If @tableProps and @existingTable are not set, the table
     * is not created
     */
    readonly existingTable?: ddb.Table;
    /**
     * The key path in SSM from where the credentials are to be read for the lambda to execute the API
     */
     readonly credentialKeyPath?: string;
}

/**
 * Interface defintion for the trigger constructs for the messaging service. The primary
 * source of trigger is a lambda function to begin with but other AWS resources may be
 * considered to be added in the future
 */
export interface TriggerSourceProps extends LambdaAndDynamoDBProps {
}

/**
 * Interface definition for the targets to which event bus will route events based on defined rules
 */
export interface ResourceTargetProps extends LambdaAndDynamoDBProps {
}

/**
 * Properties for the Ingestion construct
 */
export interface DataIngestionTemplateProps {
    /**
     * Properties to define tirgger source
     */
    readonly source: TriggerSourceProps;
    /**
     * Properties to define the resource targets
     */
    readonly target: ResourceTargetProps;
    /**
     * User provided instance of event bus on AWS EventBridge. If this is set, @ingestionEventBusProps
     * is ignored
     */
    readonly existingIngestionEventBus?: events.EventBus;
    /**
     * Properties to create a custom event bus
     */
    readonly ingestionEventBusProps?: events.EventBusProps;
    /**
     * Properties to define Rules to route events to targets
     */
    readonly ingestionEventRuleProps: events.RuleProps;
}

/**
 * A data type created to allow multiple construct resources created within the function to be
 * returned to the caller
 */
interface LambdaDDBConstruct {
    lambdaFunction: lambda.Function,
    ddbTable?: ddb.Table
}

/**
 * Qualify/ categorize constructs to be part of source trigger or resource targets
 */
enum Qualifier {
    SOURCE = 'Source',
    TARGET = 'Target'
}

/**
 * This construct will create a custom event bus using @IngestionProps supplied. It also automatically creates a
 * DLQ and associates it with the event bus, if none exists.
 *
 * This construct also adds the role policy permissions required for the source trigger to publish messages
 * on the event bus and for the targets to be able to read from the event bus
 */
export class DataIngestionTemplate extends cdk.Construct {
    private _bus: events.EventBus;
    private _rule: events.Rule;
    private _lambda: { [qualifier: string] : lambda.Function } = {};
    private _dynamoDB: { [qualifier: string]: ddb.Table } = {};

    constructor(scope: cdk.Construct, id: string, props: DataIngestionTemplateProps) {
        super(scope, id);

        // start of building target/ query engine lambda, optional DDB, and add optional SSM policy (TARGET)
        const _eventTarget = this.buildCustomBusAndAddRules(props);
        this._lambda[Qualifier.TARGET] = _eventTarget.lambdaFunction;

        if (props.target.credentialKeyPath) {
            this._lambda[Qualifier.TARGET].addToRolePolicy(this.buildSSMPolicy(props.target.credentialKeyPath));
        }

        if (props.target.tableProps || props.target.existingTable) {
            const _target = this.buildLambdaAndDynamoDB({
                existingLambda: this._lambda[Qualifier.TARGET],
                tableProps: props.target.tableProps,
                existingTable: props.target.existingTable
            }, Qualifier.TARGET);

            this._lambda[Qualifier.TARGET] = _target.lambdaFunction
            if (_target.ddbTable) {
                this._dynamoDB[Qualifier.TARGET] = _target.ddbTable;
            }
        }
        // end of building target/ query engine lambda, optional DDB, and add optional SSM policy

        // start of building source trigger lambda and optional DDB (SOURCE)
        const _source = this.buildLambdaAndDynamoDB(props.source, Qualifier.SOURCE);
        _source.lambdaFunction.addEnvironment("EVENT_BUS_NAME", this._bus.eventBusName)
        this._lambda[Qualifier.SOURCE] = _source.lambdaFunction;
        if (_source.ddbTable) {
            this._dynamoDB[Qualifier.SOURCE] = _source.ddbTable;
        }
        this._lambda[Qualifier.SOURCE].addToRolePolicy(this.buildPutEventPolicy());
        // end of building source trigger and optional DDB
    }

    /**
     * This method builds a custom bus and adds Rules to route events to target resources
     *
     * @param props
     */
    private buildCustomBusAndAddRules(props: DataIngestionTemplateProps): EventsRuleToLambda {
        if (props.existingIngestionEventBus) {
            this._bus = props.existingIngestionEventBus;
        }
        else if (props.ingestionEventBusProps) {
            this._bus = new events.EventBus(this, 'IngestionBus', props.ingestionEventBusProps);
        } else {
            throw new Error('Either ingestionEventBusProps or existingIngestionEventBus has to be set. Both cannot be undefined');
        }

        const _target = new EventsRuleToLambda(this, 'RuleTargetLambda', {
            lambdaFunctionProps: props.target.lambdaFunctionProps,
            existingLambdaObj: props.target.existingLambda,
            eventRuleProps: {
                ...props.ingestionEventRuleProps,
                eventBus: this._bus,
                enabled: true
            }
        });

        this._rule = _target.eventsRule;
        return _target;
    }

    /**
     * This method builds the lambda function and optionally the DynamoDB table that stores state/ config
     * information based on the parameters passed
     *
     * @param props - properties to build lambda and DynamoDB
     * @param id - @Qualifier
     */
    private buildLambdaAndDynamoDB(props: LambdaAndDynamoDBProps, id: Qualifier): LambdaDDBConstruct {
        const _lambda = defaults.buildLambdaFunction(this, {
            existingLambdaObj: props.existingLambda,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        let _ddbTable: ddb.Table| undefined;
        if (props.tableProps || props.existingTable) {
            const lambdaToDDB = new LambdaToDynamoDB(this, id, {
                existingLambdaObj: _lambda,
                dynamoTableProps: props.tableProps,
                existingTableObj: props.existingTable,
                tableEnvironmentVariableName: `${id.toUpperCase()}_DDB_TABLE`
            });

            _ddbTable = lambdaToDDB.dynamoTable;
        }

        return {
            lambdaFunction: _lambda,
            ddbTable: _ddbTable
        };
    }

    /**
     * Create SSM policy to perform GetParameter on the key path provided
     *
     * @param keyPath
     */
    private buildSSMPolicy(keyPath: string): iam.PolicyStatement {
        return new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${keyPath}` ],
            actions: [ 'ssm:GetParameter' ]
        });
    }

    private buildPutEventPolicy(): iam.PolicyStatement {
        return new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [ this._bus.eventBusArn ],
            actions: [ 'events:PutEvents' ]
        })
    }

    public get rule(): events.Rule {
        return this._rule;
    }

    public get bus(): events.EventBus {
        return this._bus;
    }

    public get sourceLambda(): lambda.Function {
        return this._lambda[Qualifier.SOURCE];
    }

    public get configTable(): ddb.Table {
        return this._dynamoDB[Qualifier.SOURCE];
    }

    public get targetLambda(): lambda.Function {
        return this._lambda[Qualifier.TARGET];
    }

    public get stateTable(): ddb.Table {
        return this._dynamoDB[Qualifier.TARGET];
    }
}
