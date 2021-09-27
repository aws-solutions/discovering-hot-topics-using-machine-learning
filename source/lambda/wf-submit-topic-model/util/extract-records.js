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
var path = require('path');
const CustomConfig = require('aws-nodesdk-custom-config');

class RecordExtractor {

    constructor () {
        const awsCustomConfig = CustomConfig.customAwsConfig();
        this.s3 = new AWS.S3(awsCustomConfig);
    }

    async transferRecords(sourceBucket, destinationBucket) {
        console.debug(`The source file is ${path.basename(sourceBucket)}`);
        let response;
        try{
            response = await this.s3.copyObject({
                CopySource: sourceBucket,
                Bucket: destinationBucket,
                Key: 'input/'+sourceBucket.split('/').splice(1).join('/') //remove bucket name and regenerating key prefix
            }).promise();
        } catch (error) {
            console.error('Error in copying object', error);
        }
        console.debug('Transfer successful');
        return response;
    }

    async emptyBucket(destinationBucket) {
        const params = {
            Bucket: destinationBucket,
        };

        while(true) {
            const objectList = await this.s3.listObjectsV2(params).promise();

            if (objectList.Contents.length === 0) {
                console.debug('Bucket is empty');
                break;
            }

            const keys = [];
            objectList.Contents.forEach((element) => {
                console.debug(`Key to delete is ${element.Key}`);
                keys.push({ Key: element.Key });
            });

            console.debug('Calling s3 deleteObjects');
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

            if (!objectList.IsTruncated) {
                break;
            }
            params.StartAfter = objectList.NextContinuationToken;
        }

        return 'Success';
    }
}

module.exports = RecordExtractor;
