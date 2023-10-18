/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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
const { SSMClient, PutParameterCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');
const AccountSecrets = require('../util/account-secrets');
const ssmMock = AWSMock.mockClient(SSMClient);
const expect = require('chai').expect;
const assert = require('assert');

describe('Error scenarios in account-secrets getSecretValue tests', () => {
    beforeEach(() => {
        ssmMock.reset();
        process.env.SOLUTION_NAME = 'discovering-hot-topics-using-machine-learning';
        process.env.STACK_NAME = 'DiscoveringHotTopicsUsingMachineLearning';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        ssmMock.on(GetParameterCommand).callsFake((params, callback) => {
            if (
                params.Name == `/${process.env.SOLUTION_NAME}/${process.env.STACK_NAME}/twitter` &&
                params.WithDecryption
            ) {
                callback(null, {
                    'Parameter': {
                        'Name': '/discovering-hot-topics-using-machine-learning/twitter',
                        'Type': 'SecureString',
                        'Value': 'SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ',
                        'Version': 1,
                        'LastModifiedDate': 1589342370.68,
                        'ARN': 'arn:aws:ssm:us-east-1:someaccountid:parameter/somepath/twitter',
                        'DataType': 'text'
                    }
                });
            } else {
                callback(new Error('Parameter does not exist', null));
            }
        });

        ssmMock.on(PutParameterCommand).callsFake((params, callback) => {
            if (params.Value === 'Dummy Values') {
                callback(null, {
                    Version: '1.0',
                    Tier: 'Standard'
                });
            } else {
                callback(new Error('Unit test failed'));
            }
        });
    });

    afterEach(() => {
        delete process.env.SOLUTION_NAME;
        delete process.env.STACK_NAME;
        delete process.env.AWS_SDK_USER_AGENT;
        ssmMock.restore();
    });

    it('should retrieve create a key with dummy value', async () => {
        const accountSecrets = new AccountSecrets();
        await accountSecrets.getTwitterSecret().catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.fail();
            }
            assert.equal(
                error.message,
                'SSM parameter key value does not exist. Create SSM parameter at /discovering-hot-topics-using-machine-learning/DiscoveringHotTopicsUsingMachineLearning/twitter and update lambda environment variable CREDENTIAL_KEY_PATH with the key'
            );
        });
    });
});

describe('account-secrets getSecretValue successful tests', () => {
    beforeEach(() => {
        ssmMock.reset();
        process.env.TWITTER_CREDENTIAL_KEY_PATH = '/fake/key/value';
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';

        ssmMock.on(GetParameterCommand).callsFake((params) => {
            if (params.Name == '/fake/key/value' && params.WithDecryption) {
                return {
                    'Parameter': {
                        'Name': '/discovering-hot-topics-using-machine-learning/twitter',
                        'Type': 'SecureString',
                        'Value': 'SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ',
                        'Version': 1,
                        'LastModifiedDate': 1589342370.68,
                        'ARN': 'arn:aws:ssm:us-east-1:someaccountid:parameter/somepath/twitter',
                        'DataType': 'text'
                    }
                };
            } else {
                throw new Error('Parameter does not exist');
            }
        });

        ssmMock.on(PutParameterCommand, (params, callback) => {
            callback(new Error('Unit test failed'));
        });
    });

    afterEach(() => {
        delete process.env.TWITTER_CREDENTIAL_KEY_PATH;
        delete process.env.AWS_SDK_USER_AGENT;
        ssmMock.restore();
    });

    it('should retrieve create a key with dummy value', async () => {
        const accountSecrets = new AccountSecrets();
        const response = await accountSecrets.getTwitterSecret();
        expect(response).to.equal('SomeFakeBearerTokenValueWithAAAAAAndZZZZZZ');
    });
});
