#!/usr/bin/env python
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed underthe Apache License, Version 2.0 (the "License"). You may not use this file except in compliance     #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################


import datetime
import json
import os
from datetime import datetime, timedelta, timezone

from botocore.exceptions import ClientError
from shared_util.custom_logging import get_logger
from shared_util.service_helper import get_service_client, get_service_resource

logger = get_logger(__name__)


def get_query_timestamp(video_id):
    ddb = get_service_resource("dynamodb")
    table = ddb.Table(os.environ["TARGET_DDB_TABLE"])

    try:
        ddb_response = table.get_item(Key={"VIDEO_ID": video_id})
    except ClientError as e:
        logger.error(f'Error in getting tracker {e.response["Error"]["Message"]}')
        raise e

    return ddb_response.get("Item", None)


def update_query_timestamp(video_id):
    ddb = get_service_client("dynamodb")
    table_name = os.environ["TARGET_DDB_TABLE"]
    current_time = datetime.now()

    # defaulting to 7 days if ingestion window is not provided
    expiry_window = str(
        int((current_time + timedelta(days=int(os.environ.get("VIDEO_SEARCH_INGESTION_WINDOW", 7)))).timestamp() * 1000)
    )

    ddb_response = ddb.put_item(
        TableName=table_name,
        Item={
            "VIDEO_ID": {"S": video_id},
            "LAST_QUERIED_TIMESTAMP": {"S": current_time.isoformat()},
            "EXP_DATE": {"N": expiry_window},
        },
    )

    logger.debug(f"Response from ddb transaction write: {json.dumps(ddb_response)}")
