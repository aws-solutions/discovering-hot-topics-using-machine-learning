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

exports.create = async() => {

    const date = new Date();
    const partitionValue = `${date.getUTCFullYear()}-${('0'+(date.getUTCMonth()+1)).slice(-2)}-${('0'+date.getUTCDate()).slice(-2)}`;
    console.debug(`Current UTC date is ${partitionValue}`);

    const awsCustomConfig = CustomConfig.customAwsConfig();
    const glue = new AWS.Glue(awsCustomConfig);

    const tableNames = process.env.TABLE_NAMES.split(',');

    for (let index = 0; index < tableNames.length; index++) {
        console.debug(`Processing table name ${tableNames[index]}`);

        try {
            await glue.getPartition({
                DatabaseName: process.env.DATABASE_NAME,
                TableName: tableNames[index],
                PartitionValues: [ partitionValue ]
            }).promise();
        } catch (error) {
            console.debug(`Entering catch block ${error.code} ${error.message}`);
            if (error.code === 'EntityNotFoundException'){
                console.debug('Creating partition');
                let { Table } = await glue.getTable({
                    DatabaseName: process.env.DATABASE_NAME,
                    Name: tableNames[index],
                }).promise();

                let storageDescriptor = Table.StorageDescriptor;
                console.debug(`Storage Descriptor is ${JSON.stringify(storageDescriptor)}`);
                let params = {
                    DatabaseName: process.env.DATABASE_NAME,
                    TableName: tableNames[index],
                    PartitionInput: {
                        StorageDescriptor: {
                            ...storageDescriptor,
                            Location: `${storageDescriptor.Location}created_at=${partitionValue}/`
                        },
                        Parameters: {
                            "created_at": partitionValue
                        },
                        Values: [ partitionValue ]
                    },
                };
                console.debug(`Params for create parition is ${JSON.stringify(params)}`);
                let createParitionResponse = await glue.createPartition(params).promise();
                console.debug(`Partitioning complete ${JSON.stringify(createParitionResponse)}`);
            }
        }
    }
}
