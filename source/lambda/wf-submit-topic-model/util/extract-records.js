/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { S3Client, CopyObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const CustomConfig = require('aws-nodesdk-custom-config');

class RecordExtractor {
    constructor() {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.s3 = new S3Client(awsCustomConfig);
    }

    async transferRecords(sourceBucket, destinationBucket) {
        console.debug(`The source file is ${path.basename(sourceBucket)}`);
        let response;
        try {
            response = await this.s3.send(
                new CopyObjectCommand({
                    CopySource: sourceBucket,
                    Bucket: destinationBucket,
                    Key: 'input/' + sourceBucket.split('/').splice(1).join('/') //remove bucket name and regenerating key prefix
                })
            );
        } catch (error) {
            console.error('Error in copying object', error);
        }
        console.debug('Transfer successful');
        return response;
    }

    async emptyBucket(destinationBucket) {
        const params = {
            Bucket: destinationBucket
        };

        while (true) {
            const objectList = await this.s3.send(new ListObjectsV2Command(params));

            if (objectList.Contents === undefined || objectList.Contents.length === 0) {
                console.debug('Bucket is empty');
                break;
            }

            const keys = [];
            objectList.Contents.forEach((element) => {
                console.debug(`Key to delete is ${element.Key}`);
                keys.push({ Key: element.Key });
            });

            console.debug('Calling s3 deleteObjects');
            const deleteResponse = await this.s3.send(
                new DeleteObjectsCommand({
                    Bucket: destinationBucket,
                    Delete: {
                        Objects: keys,
                        Quiet: true
                    }
                })
            );

            if (deleteResponse.Deleted !== undefined && deleteResponse.Deleted.length > 0) {
                deleteResponse.Deleted.forEach((notDeletedKey) => {
                    console.warn(`${JSON.stringify(notDeletedKey)} could not be deleted`);
                });
            }

            if (!objectList.IsTruncated) {
                break;
            }
            params.StartAfter = objectList.NextContinuationToken;
        }

        return 'Success';
    }
}

module.exports = RecordExtractor;
