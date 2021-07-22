#!/usr/bin/env node
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

import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface NodejsLayerVersionProps {
    /**
     * The path to the root directory of the lambda layer.
     */
    readonly entry: string

    /**
     * The runtimes compatible with the python layer.
     *
     * @default - All runtimes are supported.
     */
    readonly compatibleRuntimes?: lambda.Runtime[];

    /**
     * Path to lock file
     */
    readonly depsLockFilePath?: string;

    /**
     * Description of the lambda layer
     */
    readonly description?: string;
}

export class NodejsLayerVersion extends lambda.LayerVersion {
    constructor(scope: cdk.Construct, id: string, props: NodejsLayerVersionProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [ lambda.Runtime.NODEJS_14_X ];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.NODEJS) {
                throw new Error('Only `Nodejs` runtimes are supported');
            }
        }

        const entry = path.resolve(props.entry);

        const baseFolderName = path.basename(entry);
        super(scope, id, {
            code: lambda.Code.fromAsset(entry, {
                bundling: {
                    image: lambda.Runtime.NODEJS_14_X.bundlingImage,
                    user: 'root',
                    local: { // attempts local bundling first, if it fails, then executes docker based build
                        tryBundle(outputDir: string) {
                            try {
                                spawnSync('echo "Trying local bundling of assets" && npm ci --only=prod');
                                const targetDirectory = `${outputDir}/nodejs/node_modules/${baseFolderName}`;
                                if (!fs.existsSync(targetDirectory)) {
                                    // recursively create the target path that include 'nodejs/node_modules'
                                    fs.mkdirSync(targetDirectory, {
                                        recursive: true
                                    });
                                }
                                NodejsLayerVersion.copyFilesSyncRecursively(entry, targetDirectory);
                            } catch(error){
                                console.error('Error with local bundling', error);
                                return false;
                            }
                            return true;
                        }
                    },
                    command: [
                        // executed only if local bundling fails. Docker becomes the sencondary deployment option
                        "bash", "-c", 'echo "local bundling failed and hence building with Docker image"', [
                            "npm ci --only=prod",
                            `mkdir -p /asset-output/nodejs/node_modules/${baseFolderName}`,
                            `cp -R /asset-input/* /asset-output/nodejs/node_modules/${baseFolderName}`
                        ].join(' && ')
                    ],
                }
            }),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }

    /**
     * Copies all contents from within the source directory and recursively copies them to the
     * destination directory
     *
     * @param srcDir
     * @param dstDir
     */
    public static copyFilesSyncRecursively(srcDir: string, dstDir: string) {
        const list = fs.readdirSync(srcDir);
        let src, dst;
        list.forEach((file) => {
            src = `${srcDir}/${file}`;
            dst = `${dstDir}/${file}`;

            const stat = fs.statSync(src);

            if (stat && stat.isDirectory()) {
                if (!fs.existsSync(dst)) {
                    fs.mkdirSync(dst);
                }
            } else {
                fs.writeFileSync(dst, fs.readFileSync(src));
            }
        });
    }
}

