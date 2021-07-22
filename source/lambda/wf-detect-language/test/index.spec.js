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

const sinon = require('sinon');
const AWSMock = require('aws-sdk-mock');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');

const lambda = require('../index.js');
const __test_event__ = require('./event-test-data');

describe('When workflow->translate text is called', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';

        lambdaSpy = sinon.spy(lambda, 'handler');

        AWSMock.mock('Comprehend', 'detectDominantLanguage', (error, callback) => {
            callback(null, {
                Languages: [{
                    LanguageCode: 'en',
                    Score: '95'
                }]
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__._event))[0].feed.lang).to.equal('en');
    });

    it ('should default to en when number of chars are less than 20', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__._less_char_event))[0].feed.lang).to.equal('en');
    });

    AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
        if (params.taskToken === 'fakeToken') {
            callback(null, 'Success');
        }
    });

    AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
        if (params.taskToken === 'fakeToken') {
            callback(null, 'Success');
        }
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});


describe('When translate throws an error', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';

        lambdaSpy = sinon.spy(lambda, 'handler');

        AWSMock.mock('Comprehend', 'detectDominantLanguage', (error, callback) => {
            callback(new Error('Error in detecting language'),null);
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should receive event correctly', async () => {
        await lambda.handler(__test_event__._event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.equal(error.message,'Error in detecting language' );
            }
        });
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;

    });
});

describe('When Response contains an error', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';

        lambdaSpy = sinon.spy(lambda, 'handler');

        AWSMock.mock('Comprehend', 'detectDominantLanguage', (error, callback) => {
            callback(null, {
                error: {
                    message: 'Service returned an error'
                }
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should receive event correctly', async () => {
        await lambda.handler(__test_event__._event).catch((error) => {
            if (error instanceof assert.AssertionError) {
                assert.equal(error.message,'Service returned an error');
            }
        });
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});

describe('When receiving a valid language', () => {
    let lambdaSpy;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "cutomerAgent": "fakedata" }';
        process.env.AWS_REGION = 'us-east-1';

        lambdaSpy = sinon.spy(lambda, 'handler');

        AWSMock.mock('Comprehend', 'detectDominantLanguage', (error, callback) => {
            callback(null, {
                error: {
                    message: 'Service returned an error'
                }
            });
        });

        AWSMock.mock('StepFunctions', 'sendTaskSuccess', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });

        AWSMock.mock('StepFunctions', 'sendTaskFailure', (params, callback) => {
            if (params.taskToken === 'fakeToken') {
                callback(null, 'Success');
            }
        });
    });

    it ('should receive event correctly', async () => {
        if (! lambdaSpy.threw()) expect.fail;
        expect((await lambda.handler(__test_event__._with_valid_lang))[0].feed.lang).to.equal('en');
    });

    afterEach(() => {
        AWSMock.restore('Comprehend');
        AWSMock.restore('StepFunctions');
        lambdaSpy.restore();
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env.AWS_REGION;
    });
});