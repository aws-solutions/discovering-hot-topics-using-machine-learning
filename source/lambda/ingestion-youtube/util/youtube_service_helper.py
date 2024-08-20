#!/usr/bin/env python
######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

import googleapiclient.discovery

from util import credential_helper

youtube_resource = None


def get_youtube_service_resource():
    global youtube_resource
    if not youtube_resource:
        youtube_resource = googleapiclient.discovery.build(
            "youtube", "v3", developerKey=credential_helper.get_api_key()
        )

    return youtube_resource
