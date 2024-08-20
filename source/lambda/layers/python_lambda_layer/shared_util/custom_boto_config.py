######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import json
import os

from botocore import config


def init():
    return config.Config(
        region_name=os.environ["AWS_REGION"],
        retries={"max_attempts": 10, "mode": "standard"},
        **json.loads(os.environ["AWS_SDK_USER_AGENT"])
    )
