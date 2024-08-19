/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const sinon = require('sinon');
const assert = require('assert');
const layerFunction = require('../index');

describe('calling aws-nodesdk-custom-config', () => {
    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('should return a json config', async () => {
        const layerFuncSpy = sinon.spy(layerFunction, 'customAwsConfig');
        assert(layerFunction.customAwsConfig(), {
            ...JSON.parse(process.env.AWS_SDK_USER_AGENT),
            region: process.env.AWS_REGION,
            maxRetries: 10
        });
        sinon.assert.calledOnce(layerFuncSpy);
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});
