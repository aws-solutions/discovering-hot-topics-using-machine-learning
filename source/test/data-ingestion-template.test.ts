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

import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as ddb from '@aws-cdk/aws-dynamodb';
import { EventBus, Rule } from '@aws-cdk/aws-events';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { DataIngestionTemplate } from '../lib/ingestion/data-ingestion-template';


test('test ingestion with all parameters and custom event bridge', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    const template = new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: "CREATED_TIMESTAMP",
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: "EXP_DATE"
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        ingestionEventBusProps: {
            eventBusName: 'testBus'
        },
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [ cdk.Aws.ACCOUNT_ID ],
                region: [ cdk.Aws.REGION ],
                source: [ 'test.fake.namespace' ]
            }
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('AWS::Events::EventBus', {
        Type: 'AWS::Events::EventBus',
        Properties: {
            Name: "testBus"
        }
    }, ResourcePart.CompleteDefinition);
    expect(stack).toHaveResourceLike('AWS::Events::Rule', {
        Type: "AWS::Events::Rule",
        Properties: {
            State: "ENABLED",
            Targets: {},
            EventBusName: {},
            EventPattern: {
                account: [{ "Ref": "AWS::AccountId" }],
                region: [{ "Ref": "AWS::Region" }],
                source: [ "test.fake.namespace" ]
            }
        }
    }, ResourcePart.CompleteDefinition);
    expect(stack).toCountResources('AWS::DynamoDB::Table', 2);
    expect(stack).toCountResources('AWS::Lambda::Function', 2);

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
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: "CREATED_TIMESTAMP",
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: "EXP_DATE"
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [ cdk.Aws.ACCOUNT_ID ],
                region: [ cdk.Aws.REGION ],
                source: [ 'test.fake.namespace' ]
            }
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResourceLike('AWS::Events::EventBus', {
        Type: 'AWS::Events::EventBus',
        Properties: {
            Name: "testStackexistingEventBus7236155E"
        }
    }, ResourcePart.CompleteDefinition);
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
                    runtime: lambda.Runtime.NODEJS_14_X,
                    handler: 'index.handler',
                    code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
                },
                tableProps: {
                    partitionKey: {
                        name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                        type: ddb.AttributeType.STRING
                    }
                }
            },
            target: {
                lambdaFunctionProps: {
                    runtime: lambda.Runtime.NODEJS_14_X,
                    handler: 'index.handler',
                    code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
                },
                tableProps: {
                    partitionKey: {
                        name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                        type: ddb.AttributeType.STRING
                    },
                    sortKey: {
                        name: "CREATED_TIMESTAMP",
                        type: ddb.AttributeType.STRING
                    },
                    timeToLiveAttribute: "EXP_DATE"
                },
                credentialKeyPath: 'test/fakekey/fakepath'
            },
            ingestionEventRuleProps: {
                enabled: true,
                eventPattern: {
                    account: [ cdk.Aws.ACCOUNT_ID ],
                    region: [ cdk.Aws.REGION ],
                    source: [ 'test.fake.namespace' ]
                }
            }
        });
    } catch(error) {
        expect(error).toEqual(new Error('Either ingestionEventBusProps or existingIngestionEventBus has to be set. Both cannot be undefined'));
    }

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('do not create source dynamodb table', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                },
                sortKey: {
                    name: "CREATED_TIMESTAMP",
                    type: ddb.AttributeType.STRING
                },
                timeToLiveAttribute: "EXP_DATE"
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [ cdk.Aws.ACCOUNT_ID ],
                region: [ cdk.Aws.REGION ],
                source: [ 'test.fake.namespace' ]
            }
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
    expect(stack).toCountResources('AWS::Lambda::Function', 2);
    expect(stack).toHaveResourceLike('AWS::DynamoDB::Table', {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
            KeySchema: [{
                AttributeName: "ACCOUNT_IDENTIFIER",
                KeyType: "HASH"
            }, {
                AttributeName: "CREATED_TIMESTAMP",
                KeyType: "RANGE",
            }]
        }
    }, ResourcePart.CompleteDefinition);
});

test('do not create target dynamodb table', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            },
            tableProps: {
                partitionKey: {
                    name: "ACCOUNT_IDENTIFIER", // socail media account identifier is the partition key
                    type: ddb.AttributeType.STRING
                }
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
            credentialKeyPath: 'test/fakekey/fakepath'
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [ cdk.Aws.ACCOUNT_ID ],
                region: [ cdk.Aws.REGION ],
                source: [ 'test.fake.namespace' ]
            }
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
    expect(stack).toCountResources('AWS::Lambda::Function', 2);
    expect(stack).not.toHaveResourceLike('AWS::DynamoDB::Table', {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
            KeySchema: [{
                AttributeName: "ACCOUNT_IDENTIFIER",
                KeyType: "HASH"
            }, {
                AttributeName: "CREATED_TIMESTAMP",
                KeyType: "RANGE",
            }]
        }
    }, ResourcePart.CompleteDefinition);
    expect(stack).toHaveResourceLike('AWS::DynamoDB::Table', {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
            KeySchema: [{
                AttributeName: "ACCOUNT_IDENTIFIER",
                KeyType: "HASH"
            }]
        }
    }, ResourcePart.CompleteDefinition);
});

test('do not create SSM credential path entry', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'testStack', {
        stackName: 'testStack'
    });

    new DataIngestionTemplate(stack, 'testCustomBus', {
        source: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`),
            }
        },
        target: {
            lambdaFunctionProps: {
                runtime: lambda.Runtime.NODEJS_14_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(`${__dirname}/../lambda/ingestion-producer`)
            },
        },
        existingIngestionEventBus: new EventBus(stack, 'existingEventBus'),
        ingestionEventRuleProps: {
            enabled: true,
            eventPattern: {
                account: [ cdk.Aws.ACCOUNT_ID ],
                region: [ cdk.Aws.REGION ],
                source: [ 'test.fake.namespace' ]
            }
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toCountResources('AWS::Lambda::Function', 2);
    expect(stack).toCountResources('AWS::Dynamo::Table', 0);
    expect(stack).not.toHaveResourceLike('AWS::IAM:Policy', {
        Type: 'AWS::IAM:Policy',
        Properties: {
            Statement: [{
                Action: 'ssm:GetParameter',
                Effect: 'Allow',
                Resource: {
                    "Fn::Join": [
                        "", [
                            "arn:", {
                                "Ref": "AWS::Partition"
                            },
                            ":ssm:", {
                                "Ref": "AWS::Region"
                            },
                            ":", {
                                "Ref": "AWS::AccountId"
                            },
                            ":parametertest/fakekey/fakepath"
                        ]
                    ]
                }
            }]
        }
    }, ResourcePart.Properties);
});