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
const RecordExtractor = require('./util/extract-records');
const IngestionWindow = require('./util/ingestion-windows');
const CustomConfig = require('aws-nodesdk-custom-config');

exports.handler = async (event) => {
    const extractor = new RecordExtractor();
    const datePrefixList = IngestionWindow.calculateIngestionWindow(new Date(), parseInt(process.env.INGESTION_WINDOW));

    await extractor.emptyBucket(process.env.INGESTION_S3_BUCKET_NAME);
    console.debug(`Got ${datePrefixList.length} in the bucket prefix list`);

    const awsCustomConfig = CustomConfig.customAwsConfig();
    const s3 = new AWS.S3(awsCustomConfig);

    // Copy the data based on the ingestion window. Comprehend does not allow to pass bucket prefix list. The data
    // in the bucket here is stored by date. Hence all files under the bucket prefix can be passed to Comprehend
    let response = {};
    const sourcePrefixList = process.env.SOURCE_PREFIX.toLowerCase().split(",")
    console.debug(`Found following prefixes: ${JSON.stringify(sourcePrefixList)}`);
    for (let [index, sourceTypePrefix] of sourcePrefixList.entries()) {
        console.debug(`Executing for source type: ${sourceTypePrefix}`);
        let dataExists = false;
        for (const datePrefix of datePrefixList) {

            while(true) {
                const params = {
                    Bucket: process.env.RAW_BUCKET_FEED,
                    Prefix: sourceTypePrefix+"/"+datePrefix
                };
                console.debug(`Parameters for S3 list: ${JSON.stringify(params)}`);
                const objectList = await s3.listObjectsV2(params).promise();

                if (objectList.Contents.length === 0) {
                    console.debug('No objects found');
                    break;
                }

                objectList.Contents.forEach(async (element) => {
                    dataExists = true;
                    console.debug(`Key is ${element.Key} and the source bucket path is ${process.env.RAW_BUCKET_FEED+'/'+element.Key}`);
                    await extractor.transferRecords(process.env.RAW_BUCKET_FEED+'/'+element.Key, process.env.INGESTION_S3_BUCKET_NAME);
                });

                console.debug(`Transfering records from ${datePrefix}`);


                if (!objectList.IsTruncated) {
                    break;
                }
                params.StartAfter = objectList.NextContinuationToken;
            }
        }

        if (dataExists) {
            const comprehend = new AWS.Comprehend(awsCustomConfig);

            var topicJobParams = {
                DataAccessRoleArn: process.env.DATA_ACCESS_ARN,
                InputDataConfig: {
                    S3Uri: `s3://${process.env.INGESTION_S3_BUCKET_NAME}/input/${sourceTypePrefix}/`,
                    InputFormat: 'ONE_DOC_PER_LINE'
                },
                OutputDataConfig: {
                    S3Uri: `s3://${process.env.INGESTION_S3_BUCKET_NAME}/output/${sourceTypePrefix}/`
                },
                NumberOfTopics: process.env.NUMBER_OF_TOPICS, //number of topics to see in topic modeling
                JobName: `${process.env.STACK_NAME}-${Date.now()}`
            };

            response[sourceTypePrefix] = await comprehend.startTopicsDetectionJob(topicJobParams).promise();
        }

        // Only need to throttle if the loop will iterate. If there are no more iterations left to be looped
        // then the throttling logic does not need to be exeuted. Using 'length-1' since the iterator will move to the
        // next index after the current loop ends.
        if (index < sourcePrefixList.length - 1) {
            await new Promise(r => setTimeout(r, 1000)); //throttle requests.
        }
    }

    if (Object.keys(response).length > 0) {
        if (Object.keys(response).filter(key => response[key]["JobStatus"] === "SUBMITTED").length > 0) {
            response["JobStatus"] = "SUBMITTED";
        } else {
            response["JobStatus"] = "FAILED";
        }
    } else {
        response["JobStatus"] = "NO_DATA";
    }

    return response;
}
