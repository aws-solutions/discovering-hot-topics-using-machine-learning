/**********************************************************************************************************************
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      *
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
const url = require('url');
const path = require('path');
const stream = require('stream');
const axios = require('axios');
const CustomConfig = require('aws-nodesdk-custom-config');


const downloadFile = async (imageUrl) => {
    console.debug(`Image url is ${imageUrl}`);
    return axios.default.get(imageUrl, { responseType: 'stream' });
}

const uploadFromStream = (fileResponse, fileName, destinationBucket) => {
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const s3 = new AWS.S3(awsCustomConfig);
    var passThrough = new stream.PassThrough();
    const promise = s3.upload({
        Bucket: destinationBucket,
        Key: fileName,
        Body: passThrough,
        ContentType: fileResponse.headers['content-type'],
        ContentLength: fileResponse.headers['content-length'],
    }).promise();
    return { passThrough, promise };
}

exports.retrieveImageAndS3Upload = async (imageUrl, destinationBucket, bucketPrefix) => {
    const responseStream = await downloadFile(imageUrl);
    const { passThrough, promise } = uploadFromStream(responseStream, bucketPrefix+'/'+path.basename(url.parse(imageUrl).pathname), destinationBucket);
    responseStream.data.pipe(passThrough);
    return promise
        .then((result) => {
            return result.Location
        }).catch((error) => {
            console.error('Error in uploading content', error);
            throw error;
        });
};