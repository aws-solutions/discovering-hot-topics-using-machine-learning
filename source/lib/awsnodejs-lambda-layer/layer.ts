#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { spawnSync } from 'child_process';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface NodejsLayerVersionProps {
    /**
     * The path to the root directory of the lambda layer.
     */
    readonly entry: string;

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
    constructor(scope: Construct, id: string, props: NodejsLayerVersionProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [lambda.Runtime.NODEJS_20_X];

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
                    image: lambda.Runtime.NODEJS_20_X.bundlingImage,
                    user: 'root',
                    local: {
                        // attempts local bundling first, if it fails, then executes docker based build
                        tryBundle(outputDir: string) {
                            try {
                                spawnSync('echo "Trying local bundling of assets" && npm ci --only=prod'); // NOSONAR - building lambda assets
                                const targetDirectory = `${outputDir}/nodejs/node_modules/${baseFolderName}`;
                                if (!fs.existsSync(targetDirectory)) {
                                    // recursively create the target path that include 'nodejs/node_modules'
                                    fs.mkdirSync(targetDirectory, {
                                        recursive: true
                                    });
                                }
                                NodejsLayerVersion.copyFilesSyncRecursively(entry, targetDirectory);
                            } catch (error) {
                                console.error('Error with local bundling', error);
                                return false;
                            }
                            return true;
                        }
                    },
                    command: [
                        // executed only if local bundling fails. Docker becomes the sencondary deployment option
                        'bash',
                        '-c',
                        'echo "local bundling failed and hence building with Docker image"',
                        [
                            'npm ci --only=prod',
                            `mkdir -p /asset-output/nodejs/node_modules/${baseFolderName}`,
                            `cp -R /asset-input/* /asset-output/nodejs/node_modules/${baseFolderName}`
                        ].join(' && ')
                    ]
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
