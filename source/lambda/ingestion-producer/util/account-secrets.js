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

"use strict"

const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');
class AccountSecrets{

    constructor() {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.parameterStore = new AWS.SSM(awsCustomConfig);
    }

    async getTwitterSecret() {
        let keyName = process.env.TWITTER_CREDENTIAL_KEY_PATH;
        if (keyName === undefined || process.env.TWITTER_CREDENTIAL_KEY_PATH === '')  {
            keyName = `/${process.env.SOLUTION_NAME}/${process.env.STACK_NAME}/twitter`;
            console.error(`Key name does not exists. Creating an SSM key name in the following path -> ${keyName}. Please insert the bearer_token in the SSM parameter store at that path`);
            await this.parameterStore.putParameter({
                Name: keyName,
                Value: 'Dummy Values',
                Description: 'Twitter Bearer Token',
                Type: 'SecureString'
              }).promise();
            throw new Error(`SSM parameter key value does not exist. Create SSM parameter at ${keyName} and update lambda environment variable CREDENTIAL_KEY_PATH with the key`)
        } else {
            console.debug(`SSM Parameter Key name is ${keyName}`);
            let responseValue;
            try {
                const secretValue = await this.parameterStore.getParameter({
                    Name: keyName,
                    WithDecryption: true
                }).promise();
                responseValue = secretValue.Parameter.Value;
            } catch(error) {
                console.error(`Error in retrieving secrets from Parameter store ${JSON.stringify(error)}`);
                throw error;
            }

            return responseValue;
        }
    }
}

module.exports = AccountSecrets;
