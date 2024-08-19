/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { SSMClient, PutParameterCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');
const CustomConfig = require('aws-nodesdk-custom-config');
class AccountSecrets {
    constructor() {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.parameterStore = new SSMClient(awsCustomConfig);
    }

    async getTwitterSecret() {
        let keyName = process.env.TWITTER_CREDENTIAL_KEY_PATH;
        if (keyName === undefined || process.env.TWITTER_CREDENTIAL_KEY_PATH === '') {
            keyName = `/${process.env.SOLUTION_NAME}/${process.env.STACK_NAME}/twitter`;
            console.error(
                `Key name does not exists. Creating an SSM key name in the following path -> ${keyName}. Please insert the bearer_token in the SSM parameter store at that path`
            );
            const putCmd = new PutParameterCommand({
                Name: keyName,
                Value: 'Dummy Values',
                Description: 'Twitter Bearer Token',
                Type: 'SecureString'
            });
            await this.parameterStore.send(putCmd);
            throw new Error(
                `SSM parameter key value does not exist. Create SSM parameter at ${keyName} and update lambda environment variable CREDENTIAL_KEY_PATH with the key`
            );
        } else {
            console.debug(`SSM Parameter Key name is ${keyName}`);
            let responseValue;
            try {
                const getCmd = new GetParameterCommand({
                    Name: keyName,
                    WithDecryption: true
                });
                const secretValue = await this.parameterStore.send(getCmd);
                responseValue = secretValue.Parameter.Value;
            } catch (error) {
                console.error(`Error in retrieving secrets from Parameter store ${JSON.stringify(error)}`);
                throw error;
            }

            return responseValue;
        }
    }
}

module.exports = AccountSecrets;
