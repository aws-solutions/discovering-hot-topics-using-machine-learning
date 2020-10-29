#!/usr/bin/env python
######################################################################################################################
#  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICNSE-2.0                                                                     #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

import logging
from crhelper import CfnResource

from util.logging import get_logger
from util.quicksight import QuicksightApi

logger = logging.getLogger(__name__)
helper = CfnResource(json_logging=False, log_level='INFO')

def get_resource_propertices(event, _):
    logger.debug(f'servicing request event:{event}')
    request_type = event['RequestType']
    resource_properties = event['ResourceProperties']
    resource = resource_properties['Resource']

    logger.info(f'servicing request request_type:{request_type} resource:{resource}')
    # TODO: Implement more flexibility in loading config and/or state from first invocation and other invocations
    resource_properties.update({'ConfigDataFile': 'util/config/config.yaml'})
    return resource_properties

def log_exception(error):
    """
    Do logging in addition to crhelper exception handeling
    """
    logger.error(f'quicksight-application resources action error: {error}')
    import sys
    import traceback
    exc_type, exc_value, exc_traceback = sys.exc_info()
    format_exception = traceback.format_exception(
        exc_type, exc_value,
        exc_traceback
    )
    logger.error(repr(format_exception))


@ helper.create
def custom_resource_create(event, _):
    request_type = 'Create'
    resource_properties = get_resource_propertices(event, _)
    resource = resource_properties['Resource']
    qs_api = QuicksightApi(resource_properties)

    try:
        if resource == 'all':
            qs_api.create_all_resources()
        elif resource == 'datasource':
            qs_api.create_data_source()
        elif resource == 'dataset':
            qs_api.create_data_sets()
        elif resource == 'analysis':
            qs_api.create_analysis()
        elif resource == 'dashboard':
            qs_api.create_dashboard()
        else:
            logger.error(f'Not handling request resource:{resource}, request_type:{request_type}')
            raise ValueError(f'Received unsupported request request_type:{request_type}, resource:{resource}')
        if resource in ['all', 'analysis', 'dashboard']:
            analysis_url = qs_api.quicksight_application.get_analysis().url
            dashboard_url = qs_api.quicksight_application.get_dashboard().url
            helper.Data.update({
                'analysis_url': analysis_url,
                'dashboard_url': dashboard_url
            })
    except Exception as error:
        # Do logging in addition to crhelper exception handeling
        log_exception(error)
        qs_api.delete_all_resources()
        raise(error)

    logger.info(f'finished with request_type:{request_type} resource:{resource}')
    return None

@ helper.delete
def custom_resource_delete(event, _):
    request_type = 'Delete'
    resource_properties = get_resource_propertices(event, _)
    resource = resource_properties['Resource']
    qs_api = QuicksightApi(resource_properties)

    try:
        if resource == 'all':
            qs_api.delete_all_resources()
        elif resource == 'datasource':
            qs_api.delete_data_source()
        elif resource == 'dataset':
            qs_api.delete_data_sets()
        elif resource == 'analysis':
            qs_api.delete_analysis()
        elif resource == 'dashboard':
            qs_api.delete_dashboard()
        else:
            logger.error(f'Not handling request resource:{resource}, request_type:{request_type}')
            raise ValueError(f'Received unsupported request request_type:{request_type}, resource:{resource}')
    except Exception as error:
        # Do logging in addition to crhelper exception handeling
        log_exception(error)
        raise(error)

    logger.info(f'finished with request_type:{request_type} resource:{resource}')
    return None

@ helper.update
def custom_resource_update(event, _):
    # TODO: We don't support update. There are some updates that we should conceivably support. For example
    #       an update to the principal arn used when creating the resources
    try:
        request_type = 'Update'
        resource_properties = get_resource_propertices(event, _)
        resource = resource_properties['Resource']

        logger.error(f'Not handling request resource:{resource}, request_type:{request_type}')
        raise ValueError(f'Received unsupported request request_type:{request_type}, resource:{resource}')

    except Exception as error:
        # Do logging in addition to crhelper exception handeling
        log_exception(error)
        raise(error)

def handler(event, context):
    helper(event, context)
