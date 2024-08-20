/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const CustomConfig = require('aws-nodesdk-custom-config');
class ImageExtractor {
    constructor() {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.s3 = new S3Client(awsCustomConfig);
    }

    /**
     * Empty the bucket before putting in images for analysis
     *
     * @param {destinationBucket} destinationBucket
     */
    async emptyBucket(destinationBucket, keyPrefix) {
        const params = {
            Bucket: destinationBucket,
            Prefix: keyPrefix
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

            console.debug(`Key are ${JSON.stringify(keys)}`);

            try {
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
            } catch (error) {
                console.error(`Error in deleting following keys ${JSON.stringify(keys)}`, error);
                throw error;
            }

            if (!objectList.IsTruncated) {
                break;
            }
            params.StartAfter = data.NextContinuationToken;
        }

        return 'Success';
    }
}

module.exports = ImageExtractor;
