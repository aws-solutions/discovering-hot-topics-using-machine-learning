#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

import { CfnTable, IDatabase, ITable, Table } from "@aws-cdk/aws-glue";
import { Bucket } from "@aws-cdk/aws-s3";
import { Aws, Construct } from "@aws-cdk/core";

export interface TwitterTableProps {
    readonly s3InputDataBucket: Bucket,
    readonly s3BucketPrefix: string,
    readonly database: IDatabase,
    readonly tableName: string
}

export class TwitterTable extends Construct {
    private _table: ITable;

    constructor (scope: Construct, id: string, props: TwitterTableProps) {
        super(scope, id);

        const twitterTable = new CfnTable(this, 'TwitterRecord', {
            catalogId: props.database.catalogId,
            databaseName: props.database.databaseName,
            tableInput: {
                name: props.tableName,
                description: 'Store Twitter Records',
                parameters: {
                    classification: 'parquet',
                    has_encrypted_data: false
                },
                storageDescriptor: {
                    compressed: false,
                    inputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
                    location: props.s3InputDataBucket.s3UrlForObject(props.s3BucketPrefix),
                    outputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
                    serdeInfo: {
                        serializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
                    },
                    columns: this.twitterColumns,
                    storedAsSubDirectories: true,
                },
                partitionKeys: [{
                    name: 'db_created_at',
                    type: 'timestamp'
                }],
                tableType: 'EXTERNAL_TABLE'
            }
        });

        this._table = Table.fromTableArn(this, 'Table', `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${props.database.databaseName}/${twitterTable.ref}`);
    }

    private get twitterColumns(): CfnTable.ColumnProperty [] {
        return [{
            name: 'account_name',
            type: 'string'
        }, {
            name: 'platform',
            type: 'string'
        }, {
            name: 'coordinates',
            type: 'struct<type:string,coordinates:array<double>>'
        }, {
            name: 'retweeted',
            type: 'boolean'
        }, {
            name: 'source',
            type: 'string'
        }, {
            name: 'entities',
            type: 'struct<hashtags:array<struct<text:string,indices:array<bigint>>>,urls:array<struct<url:string,expanded_url:string,display_url:string,indices:array<bigint>>>>'
        }, {
            name: 'reply_count',
            type: 'bigint'
        }, {
            name: 'favorite_count',
            type: 'bigint'
        }, {
            name: 'geo',
            type: 'struct<type:string,coordinates:array<double>>'
        }, {
            name: 'id_str',
            type: 'string'
        }, {
            name: 'truncated',
            type: 'boolean'
        }, {
            name: 'text',
            type: 'string'
        }, {
            name: 'retweet_count',
            type: 'bigint'
        }, {
            name: 'possibly_sensitive',
            type: 'boolean'
        }, {
            name: 'filter_level',
            type: 'string'
        }, {
            name: 'created_at',
            type: 'string'
        }, {
            name: 'place',
            type: 'struct<id:string,url:string,place_type:string,name:string,full_name:string,country_code:string,country:string,bounding_box:struct<type:string,coordinates:array<array<array<float>>>>>'
        }, {
            name: 'favorited',
            type: 'boolean'
        }, {
            name: 'lang',
            type: 'string'
        }, {
            name: 'in_reply_to_screen_name',
            type: 'string'
        }, {
            name: 'is_quote_status',
            type: 'boolean'
        }, {
            name: 'in_reply_to_user_id_str',
            type: 'string'
        }, {
            name: 'user',
            type: 'struct<id:bigint,id_str:string,name:string,screen_name:string,location:string,url:string,description:string,translator_type:string,protected:boolean,verified:boolean,followers_count:bigint,friends_count:bigint,listed_count:bigint,favourites_count:bigint,statuses_count:bigint,created_at:string,utc_offset:bigint,time_zone:string,geo_enabled:boolean,lang:string,contributors_enabled:boolean,is_translator:boolean,profile_background_color:string,profile_background_image_url:string,profile_background_image_url_https:string,profile_background_tile:boolean,profile_link_color:string,profile_sidebar_border_color:string,profile_sidebar_fill_color:string,profile_text_color:string,profile_use_background_image:boolean,profile_image_url:string,profile_image_url_https:string,profile_banner_url:string,default_profile:boolean,default_profile_image:boolean>'
        }, {
            name: 'quote_count',
            type: 'bigint'
        }]
    }

    public get table(): ITable {
        return this._table;
    }
}