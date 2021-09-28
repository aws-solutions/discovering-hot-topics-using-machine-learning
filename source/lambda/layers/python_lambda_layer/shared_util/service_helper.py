#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import boto3

from shared_util import custom_boto_config, custom_logging

logger = custom_logging.get_logger(__name__)
_boto3_clients = dict()
_boto3_resources = dict()


def get_service_client(service_name):
    """Get global service boto3 client"""
    global _boto3_clients
    if service_name not in _boto3_clients:
        logger.debug(f"Initializing global boto3 client for {service_name}")
        _boto3_clients[service_name] = boto3.client(service_name, config=custom_boto_config.init())
    return _boto3_clients[service_name]


def get_service_resource(service_name):
    """Get global service botot3 resources"""
    global _boto3_resources
    if service_name not in _boto3_resources:
        logger.debug(f"Initializing global boto3 resource for {service_name}")
        _boto3_resources[service_name] = boto3.resource(service_name, config=custom_boto_config.init())
    return _boto3_resources[service_name]
