/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DataIngestionTemplate } from '../lib/ingestion/data-ingestion-template';

test('test ingestion with all parameters and custom event bridge', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const template = new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: 'CREATED_TIMESTAMP',
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: 'EXP_DATE'
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        ingestionEventBusProps: {
            eventBusName: 'testBus'
        },
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [cdk.Aws.ACCOUNT_ID],
                region: [cdk.Aws.REGION],
                source: ['test.fake.namespace']
            }
        }
    });

    Template.fromStack(stack).hasResourceProperties('AWS::Events::EventBus', {
        Name: 'testBus'
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Events::Rule', {
        State: 'ENABLED',
        Targets: Match.anyValue(),
        EventBusName: {},
        EventPattern: {
            account: [{ 'Ref': 'AWS::AccountId' }],
            region: [{ 'Ref': 'AWS::Region' }],
            source: ['test.fake.namespace']
        }
    });
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 2);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);

    // test gettter functions
    expect(template.bus).not.toBeNull();
    expect(template.bus).toBeInstanceOf(EventBus);

    expect(template.configTable).not.toBeNull();
    expect(template.configTable).toBeInstanceOf(ddb.Table);

    expect(template.rule).not.toBeNull();
    expect(template.rule).toBeInstanceOf(Rule);

    expect(template.stateTable).not.toBeNull();
    expect(template.stateTable).toBeInstanceOf(ddb.Table);

    expect(template.targetLambda).not.toBeNull();
    expect(template.targetLambda).toBeInstanceOf(lambda.Function);

    expect(template.sourceLambda).not.toBeNull();
    expect(template.sourceLambda).toBeInstanceOf(lambda.Function);
});

test('test ingestion with existing event bus', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: 'CREATED_TIMESTAMP',
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: 'EXP_DATE'
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [cdk.Aws.ACCOUNT_ID],
                region: [cdk.Aws.REGION],
                source: ['test.fake.namespace']
            }
        }
    });

    Template.fromStack(stack).hasResourceProperties('AWS::Events::EventBus', {
        Name: 'testStackexistingEventBus7236155E'
    });
});

test('fail when neither existing bus nor event bus properties are provided', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    try {
        new DataIngestionTemplate(stack, 'testCustomBus', {
            source: {
                lambdaFunctionProps: {
                    runtime: lambda.Runtime.NODEJS_20_X,
                    handler: 'index.handler',
                    code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
                },
                tableProps: {
                    partitionKey: {
                        name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                        type: ddb.AttributeType.STRING
                    }
                }
            },
            target: {
                lambdaFunctionProps: {
                    runtime: lambda.Runtime.NODEJS_20_X,
                    handler: 'index.handler',
                    code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
                },
                tableProps: {
                    partitionKey: {
                        name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                        type: ddb.AttributeType.STRING
                    },
                    sortKey: {
                        name: 'CREATED_TIMESTAMP',
                        type: ddb.AttributeType.STRING
                    },
                    timeToLiveAttribute: 'EXP_DATE'
                },
                credentialKeyPath: 'test/fakekey/fakepath'
            },
            ingestionEventRuleProps: {
                enabled: true,
                eventPattern: {
                    account: [cdk.Aws.ACCOUNT_ID],
                    region: [cdk.Aws.REGION],
                    source: ['test.fake.namespace']
                }
            }
        });
    } catch (error) {
        expect(error).toEqual(
            new Error(
                'Either ingestionEventBusProps or existingIngestionEventBus has to be set. Both cannot be undefined'
            )
        );
    }
});

test('do not create source dynamodb table', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: 'CREATED_TIMESTAMP',
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: 'EXP_DATE'
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [cdk.Aws.ACCOUNT_ID],
                region: [cdk.Aws.REGION],
                source: ['test.fake.namespace']
            }
        }
    });

    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
    Template.fromStack(stack).hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
            {
                AttributeName: 'ACCOUNT_IDENTIFIER',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'CREATED_TIMESTAMP',
                KeyType: 'RANGE'
            }
        ]
    });
});

test('do not create target dynamodb table', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: 'ACCOUNT_IDENTIFIER', // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [cdk.Aws.ACCOUNT_ID],
                region: [cdk.Aws.REGION],
                source: ['test.fake.namespace']
            }
        }
    });

    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
    Template.fromStack(stack).hasResourceProperties(
        'AWS::DynamoDB::Table',
        Match.not({
            Type: 'AWS::DynamoDB::Table',
            Properties: {
                KeySchema: [
                    {
                        AttributeName: 'ACCOUNT_IDENTIFIER',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'CREATED_TIMESTAMP',
                        KeyType: 'RANGE'
                    }
                ]
            }
        })
    );
    Template.fromStack(stack).hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
            {
                AttributeName: 'ACCOUNT_IDENTIFIER',
                KeyType: 'HASH'
            }
        ]
    });
});

test('do not create SSM credential path entry', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            }
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [cdk.Aws.ACCOUNT_ID],
                region: [cdk.Aws.REGION],
                source: ['test.fake.namespace']
            }
        }
    });

    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
    Template.fromStack(stack).resourceCountIs('AWS::Dynamo::Table', 0);
    Template.fromStack(stack).resourceCountIs('AWS::IAM:Policy', 0);
});
