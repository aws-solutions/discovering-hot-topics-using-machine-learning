#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
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
