/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.orglicenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

'use strict';

const AWSMock = require('aws-sdk-client-mock');
const { SFNClient: StepFunctions, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const sfnMock = AWSMock.mockClient(StepFunctions);
const lambda = require('../index.js');
const sinon = require('sinon');
const chai = require('chai');
const assert = require('assert');

const expect = chai.expect;

describe('when consumer lambda is invoked', () => {
    let lambdaSpy;

    beforeEach(() => {
        sfnMock.reset();
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        lambdaSpy = sinon.spy(lambda, 'handler');

        sfnMock.on(StartExecutionCommand).callsFake((params, callback) => {
            callback(null, 'Success');
        });

        process.env.STATE_MACHINE_ARN = 'arn:aws:us-east-1:1234664:/stepfunctions/workflow';
    });

    it('should receive the event payload correctly', async () => {
        const event = {
            'Records': [
                {
                    'kinesis': {
                        'partitionKey': 'partitionKey-03',
                        'kinesisSchemaVersion': '1.0',
                        'data': 'somefakedata',
                        'sequenceNumber': '49545115243490985018280067714973144582180062593244200961',
                        'approximateArrivalTimestamp': 1428537600.0
                    },
                    'eventSource': 'aws:kinesis',
                    'eventID': 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
                    'invokeIdentityArn': 'arn:aws:iam::EXAMPLE',
                    'eventVersion': '1.0',
                    'eventName': 'aws:kinesis:record',
                    'eventSourceARN': 'arn:aws:kinesis:EXAMPLE',
                    'awsRegion': 'us-east-1'
                }
            ]
        };

        if (!lambdaSpy.threw()) expect.fail;
        expect(await lambda.handler(event)).to.be.undefined;
    });

    it('should invoke the step function', async () => {
        const event = {
            'Records': [
                {
                    'kinesis': {
                        'partitionKey': 'partitionKey-03',
                        'kinesisSchemaVersion': '1.0',
                        'data': 'somefakedata',
                        'sequenceNumber': '49545115243490985018280067714973144582180062593244200961',
                        'approximateArrivalTimestamp': 1428537600.0
                    },
                    'eventSource': 'aws:kinesis',
                    'eventID': 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
                    'invokeIdentityArn': 'arn:aws:iam::EXAMPLE',
                    'eventVersion': '1.0',
                    'eventName': 'aws:kinesis:record',
                    'eventSourceARN': 'arn:aws:kinesis:EXAMPLE',
                    'awsRegion': 'us-east-1'
                }
            ]
        };
        expect(
            sfnMock.on(StartExecutionCommand).resolves({
                stateMachineArn: process.env.STATE_MACHINE_ARN,
                input: event.Records[0].kinesis.data
            })
        ).is.ok;
    });

    afterEach(() => {
        sfnMock.restore();
        delete process.env.WORKFLOW_ARN;
        delete process.env.AWS_SDK_USER_AGENT;
        lambdaSpy.restore();
    });
});

describe('In an event stepfunction throws an error', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        sfnMock.on(StartExecutionCommand).callsFake((params, callback) => {
            callback(new Error('Fake error for stepfunctions'), null);
        });

        process.env.WORKFLOW_ARN = 'arn:aws:us-east-1:1234664:/stepfunctions/workflow';
    });

    it('should throw an error', async () => {
        const event = {
            'Records': [
                {
                    'kinesis': {
                        'partitionKey': 'partitionKey-03',
                        'kinesisSchemaVersion': '1.0',
                        'data': 'Mockdataforfailure',
                        'sequenceNumber': '49545115243490985018280067714973144582180062593244200961',
                        'approximateArrivalTimestamp': 1428537600.0
                    },
                    'eventSource': 'aws:kinesis',
                    'eventID': 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
                    'invokeIdentityArn': 'arn:aws:iam::EXAMPLE',
                    'eventVersion': '1.0',
                    'eventName': 'aws:kinesis:record',
                    'eventSourceARN': 'arn:aws:kinesis:EXAMPLE',
                    'awsRegion': 'us-east-1'
                }
            ]
        };
        lambda.handler(event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert(error.message, 'Fake error for stepfunctions');
        });
    });

    afterEach(() => {
        sfnMock.restore();
        delete process.env.WORKFLOW_ARN;
        delete process.env.AWS_SDK_USER_AGENT;
    });
});
