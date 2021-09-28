/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
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

"use strict"

const sinon = require('sinon');
const assert = require('assert');
const layerFunction = require('../index');

describe('calling aws-nodesdk-custom-config', () => {
    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }'
        process.env.AWS_REGION = 'us-east-1'
    });

    it('should return a json config', async () => {
        const layerFuncSpy = sinon.spy(layerFunction, 'customAwsConfig');
        assert(layerFunction.customAwsConfig(), {
            ...JSON.parse(process.env.AWS_SDK_USER_AGENT),
            region: process.env.AWS_REGION,
            maxRetries: 10,
        });
        sinon.assert.calledOnce(layerFuncSpy);
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});