/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict"

const AWS = require('aws-sdk');
const RecordExtractor = require('./util/extract-records');
const IngestionWindow = require('./util/ingestion-windows');

exports.handler = async (event) => {
    const extractor = new RecordExtractor();
    const bucketPrefixList = IngestionWindow.calculateIngestionWindow(new Date(), parseInt(process.env.INGESTION_WINDOW));

    await extractor.emptyBucket(process.env.INGESTION_S3_BUCKET_NAME);
    console.debug(`Got ${bucketPrefixList.length} in the bucket prefix list`);

    const s3 = new AWS.S3();
    for (const bucketPrefix of bucketPrefixList) {

        while(true) {
            const params = {
                Bucket: process.env.RAW_BUCKET_FEED,
                Prefix: bucketPrefix
            };
            const objectList = await s3.listObjectsV2(params).promise();

            if (objectList.Contents.length == 0) {
                console.debug('No objects found');
                break;
            }

            objectList.Contents.forEach(async (element) => {
                console.debug(`Key is ${element.Key} and the source bucket path is ${process.env.RAW_BUCKET_FEED+'/'+element.Key}`);
                await extractor.transferRecords(process.env.RAW_BUCKET_FEED+'/'+element.Key, process.env.INGESTION_S3_BUCKET_NAME);
            });

            console.debug(`Transfering records from ${bucketPrefix}`);


            if (!objectList.IsTruncated) {
                break;
            }
            params.StartAfter = objectList.NextContinuationToken;
        }
    }

    //number of topics to see in topic modeling

    const comprehend = new AWS.Comprehend();
    var params = {
        DataAccessRoleArn: process.env.DATA_ACCESS_ARN,
        InputDataConfig: {
            S3Uri: `s3://${process.env.INGESTION_S3_BUCKET_NAME}`,
            InputFormat: 'ONE_DOC_PER_LINE'
        },
        OutputDataConfig: {
            S3Uri: `s3://${process.env.INFERENCE_BUCKET}`
        },
        NumberOfTopics: process.env.NUMBER_OF_TOPICS,
        JobName: `${process.env.STACK_NAME}-${Date.now()}`
    };

    return await comprehend.startTopicsDetectionJob(params).promise();
}