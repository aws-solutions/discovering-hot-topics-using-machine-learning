#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as glue_alpha from '@aws-cdk/aws-glue-alpha';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { GenericCfnTable, GenericCfnTableProps } from "./generic-table-construct";

export class TwitterTable extends GenericCfnTable {

    constructor(scope: Construct, id: string, props: GenericCfnTableProps) {
        super(scope, id, props);
    }

    protected getColumns(): glue.CfnTable.ColumnProperty[] {
        return [{
            name: 'account_name',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'platform',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'coordinates',
            type: glue_alpha.Schema.struct(this.coordinatesType).inputString,
        }, {
            name: 'retweeted',
            type: glue_alpha.Schema.BOOLEAN.inputString
        }, {
            name: 'source',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'entities',
            //type: 'struct<hashtags:array<struct<text:string,indices:array<bigint>>>,urls:array<struct<url:string,expanded_url:string,display_url:string,indices:array<bigint>>>>'
            type: glue_alpha.Schema.struct([{
                name: 'hastags',
                type: glue_alpha.Schema.array(glue_alpha.Schema.struct([{
                    name: 'text',
                    type: glue_alpha.Schema.STRING
                }, {
                    name: 'indices',
                    type: glue_alpha.Schema.array(glue_alpha.Schema.BIG_INT)
                }]))
            }, {
                name: 'urls',
                type: glue_alpha.Schema.array(glue_alpha.Schema.struct([{
                    name: 'url',
                    type: glue_alpha.Schema.STRING
                }, {
                    name: 'expanded_url',
                    type: glue_alpha.Schema.STRING
                }, {
                    name: 'display_url',
                    type: glue_alpha.Schema.STRING
                }, {
                    name: 'indices',
                    type: glue_alpha.Schema.array(glue_alpha.Schema.BIG_INT)
                }]))
            }]).inputString
        }, {
            name: 'reply_count',
            type: glue_alpha.Schema.BIG_INT.inputString
        }, {
            name: 'favorite_count',
            type: glue_alpha.Schema.BIG_INT.inputString
        }, {
            name: 'geo',
            type: glue_alpha.Schema.struct(this.coordinatesType).inputString,
        }, {
            name: 'id_str',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'truncated',
            type: glue_alpha.Schema.BOOLEAN.inputString
        }, {
            name: 'text',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'retweet_count',
            type: glue_alpha.Schema.BIG_INT.inputString
        }, {
            name: 'possibly_sensitive',
            type: glue_alpha.Schema.BOOLEAN.inputString
        }, {
            name: 'filter_level',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'place',
            //type: 'struct<id:string,url:string,place_type:string,name:string,full_name:string,country_code:string,country:string,bounding_box:struct<type:string,coordinates:array<array<array<float>>>>>'
            type: glue_alpha.Schema.struct([{
                name: 'id',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'url',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'place_type',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'name',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'full_name',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'country_code',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'country',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'bounding_box',
                type: glue_alpha.Schema.struct([{
                    name: 'type',
                    type: glue_alpha.Schema.STRING
                }, {
                    name: 'coordinates',
                    type: glue_alpha.Schema.array(glue_alpha.Schema.array(glue_alpha.Schema.array(glue_alpha.Schema.FLOAT)))
                }])
            }]).inputString
        }, {
            name: 'favorited',
            type: glue_alpha.Schema.BOOLEAN.inputString
        }, {
            name: 'lang',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'in_reply_to_screen_name',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'is_quote_status',
            type: glue_alpha.Schema.BOOLEAN.inputString
        }, {
            name: 'in_reply_to_user_id_str',
            type: glue_alpha.Schema.STRING.inputString
        }, {
            name: 'user',
            // type: 'struct<id:bigint,id_str:string,name:string,screen_name:string,location:string,url:string,description:string,translator_type:string,protected:boolean,verified:boolean,followers_count:bigint,friends_count:bigint,
            // listed_count:bigint,favourites_count:bigint,statuses_count:bigint,created_at:string,utc_offset:bigint,time_zone:string,geo_enabled:boolean,lang:string,contributors_enabled:boolean,is_translator:boolean,
            // profile_background_color:string,profile_background_image_url:string,profile_background_image_url_https:string,profile_background_tile:boolean,profile_link_color:string,profile_sidebar_border_color:string,
            // profile_sidebar_fill_color:string,profile_text_color:string,profile_use_background_image:boolean,profile_image_url:string,profile_image_url_https:string,profile_banner_url:string,default_profile:boolean,default_profile_image:boolean>'
            type: glue_alpha.Schema.struct([{
                name: 'id',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'id_str',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'name',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'screen_name',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'location',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'url',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'description',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'translator_type',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'protected',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'verfied',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'followers_count',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'friends_count',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'listed_count',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'favourites_count',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'statuses_count',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'created_at',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'utc_offset',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'time_zone',
                type: glue_alpha.Schema.BIG_INT
            }, {
                name: 'geo_enabled',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'lang',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'contributors_enabled',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'is_translator',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'profile_background_color',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_background_image_url',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_background_image_url_https',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_background_tile',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'profile_link_color',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_sidebar_border_color',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_sidebar_fill_color',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_text_color',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_use_background_image',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'profile_image_url',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_image_url_https',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'profile_banner_url',
                type: glue_alpha.Schema.STRING
            }, {
                name: 'default_profile',
                type: glue_alpha.Schema.BOOLEAN
            }, {
                name: 'default_profile_image',
                type: glue_alpha.Schema.BOOLEAN
            }]).inputString
        }, {
            name: 'quote_count',
            type: glue_alpha.Schema.BIG_INT.inputString
        }]
    }

    private get coordinatesType(): glue_alpha.Column[] {
        return [{
            name: 'type',
            type: glue_alpha.Schema.STRING
        }, {
            name: 'coordinates',
            type: glue_alpha.Schema.array(glue_alpha.Schema.DOUBLE)
        }]
    }
}
