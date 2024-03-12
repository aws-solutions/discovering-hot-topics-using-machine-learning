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

'use strict';

const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client } = require('@aws-sdk/client-s3');
const { URL } = require('url');
const path = require('path');
const axios = require('axios');
const CustomConfig = require('aws-nodesdk-custom-config');

const downloadFile = async (imageUrl) => {
    console.debug(`Image url is ${imageUrl}`);
    return await axios.default.get(imageUrl, { responseType: 'stream' });
};

exports.retrieveImageAndS3Upload = async (imageUrl, destinationBucket, bucketPrefix) => {
    const responseStream = await downloadFile(imageUrl);
    const parsed = new URL(String(imageUrl));
    const pathName = parsed.pathname;
    const awsCustomConfig = CustomConfig.customAwsConfig();
    const s3 = new S3Client(awsCustomConfig);
    try {
        const uploadFile = new Upload({
            client: s3,
            params: {
                Bucket: destinationBucket,
                Key: bucketPrefix + '/' + path.basename(pathName),
                Body: responseStream.data,
                ContentType: responseStream.headers['content-type'],
            }
        });
        await uploadFile.done();
    } 
    catch (error) {
        console.error('Error in uploading content', error);
        throw error;
    }
};
