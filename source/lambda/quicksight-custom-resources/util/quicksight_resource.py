# #####################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                            #
#                                                                                                                     #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                              #
#                                                                                                                     #
#  http://www.apache.org/licenses/LICENSE-2.0                                                                         #
#                                                                                                                     #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES  #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions     #
#  and limitations under the License.                                                                                 #
# #####################################################################################################################

import json
import os

from util.logging import get_logger
from util.helpers import get_quicksight_client, get_aws_account_id, get_aws_partition, get_aws_region

logger = get_logger(__name__)

class ResourceSubTypeError(ValueError):
    pass


class QuickSightFailure(Exception):
    def __init__(self, msg='failed to create QuickSight resources - it is likely that permissions have not yet been granted for QuickSight to access Athena, or for QuickSight to read/ write access to your Athena S3 query results bucket', *args):
        super().__init__(msg, *args)


class QuickSightResource:
    def __init__(self, quicksight_application=None, props=None):
        self.quicksight_application = quicksight_application
        self.aws_account_id = get_aws_account_id()
        self.aws_region = get_aws_region()
        self.aws_partion = get_aws_partition()
        self.principal_arn = quicksight_application.quicksight_principal_arn

        self.type = None
        self.prefix = quicksight_application.prefix

        self.id = None
        self.name = None
        self.arn = None
        self.url = None
        self.config_data = dict()

    def use_props(self, props):
        self.id = self.prefix + '_' + self.type
        self.name = self.prefix + '_' + self.type
        self.arn = None
        if props:
            resource_props = props.get(self.type, None)
            if resource_props:
                self.id = resource_props.get('id', None)
                self.name = resource_props.get('name', None)
                self.arn = resource_props.get('arn', None)
                if not self.arn and self.id:
                    self.arn = f'arn:{self.aws_partion}:quicksight:{self.aws_region}:{self.aws_account_id}:{self.type}/{self.id}'
                    if self.type == 'analysis':
                        self.url = f'https://{self.aws_region}.quicksight.aws.amazon.com/sn/analyses/{self.id}'
                    elif self.type == 'dashboard':
                        self.url = f'https://{self.aws_region}.quicksight.aws.amazon.com/sn/{self.type}s/{self.id}'

    def use_props_with_sub_type(self, props, obj_sub_type):
        self.id = self.prefix + '_' + self.type
        self.name = self.prefix + '_' + self.type
        self.arn = None
        # TODO:REFACTOR with use_props
        if props:
            obj_props = props.get(self.type, None)
            if obj_props:
                resource_props = obj_props.get(obj_sub_type, None)
                if resource_props:
                    self.id = resource_props.get('id', None)
                    self.name = resource_props.get('name', None)
                    self.arn = resource_props.get('arn', None)
                    if not self.arn and self.id:
                        self.arn = f'arn:{self.aws_partion}:quicksight:{self.aws_region}:{self.aws_account_id}:{self.type}/{self.id}'

    def get_data(self):
        return {
            'id': self.id,
            'name': self.name,
            'arn': self.arn,
        }

    def _load_config(self, resource_type, resource_sub_types, config_data):
        """load resource configuration from config file"""
        in_dir = os.path.join('util', 'config')
        for sub_type in resource_sub_types:
            config_file = os.path.join(in_dir, f"{resource_type}-{sub_type}.config.json")
            with open(config_file, 'r') as config_fd:
                config_data_item = json.load(config_fd)
                config_data[sub_type] = config_data_item

    def _get_map(self, sub_type, map_type):
        if sub_type not in self.config_data:
            raise ResourceSubTypeError(f'Unknown sub type {sub_type}, valid types are {self.config_data.keys()}.')
        sub_type_config = self.config_data[sub_type]
        if map_type not in sub_type_config:
            raise ValueError(f'Missing {map_type} in config of data set type {sub_type}.')
        return sub_type_config[map_type]

    def __repr__(self):
        return str(self.get_data())
