
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

const AWS = require('aws-sdk');
const CustomConfig = require('aws-nodesdk-custom-config');
class ImageExtractor {
    constructor () {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.s3 = new AWS.S3(awsCustomConfig);
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

        while(true) {
            const objectList = await this.s3.listObjectsV2(params).promise();

            if (objectList.Contents.length == 0) {
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
                const deleteResponse = await this.s3.deleteObjects({
                    Bucket: destinationBucket,
                    Delete: {
                        Objects: keys,
                        Quiet: true
                    }
                }).promise();

                if (deleteResponse.Deleted !== undefined && deleteResponse.Deleted.length > 0) {
                    deleteResponse.Deleted.forEach((notDeletedKey) => {
                        console.warn(`${JSON.stringify(notDeletedKey)} could not be deleted`);
                    });
                }
            } catch(error) {
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
