/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

module.exports = {
  modulePaths: [
    "<rootDir>/../layers/"
  ],
  testEnvironment: 'node',
  testMatch: [ "test/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)" ],
  collectCoverageFrom: [
    '*.js',
    'util/*.js',
    '!test/*.js',
    '!jest.config.js'
  ],
  coverageReporters: [
    "text",
    ["lcov", {"projectRoot": "../../../"}]
  ],
}