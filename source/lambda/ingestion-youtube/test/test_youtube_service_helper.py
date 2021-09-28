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

import os
import unittest
from datetime import datetime, timedelta
from test.test_credential_helper import ssm_setup
from unittest.mock import patch

from moto import mock_ssm
from util import credential_helper


@mock_ssm
@patch("util.youtube_service_helper.googleapiclient.discovery")
def test_get_youtube_service_resource(mock_youtube_resource):
    api_key = "fakeapikey"
    ssm_setup(api_key)

    from util.youtube_service_helper import get_youtube_service_resource

    youtube = get_youtube_service_resource()

    mock_youtube_resource.build.assert_called_once_with("youtube", "v3", developerKey=credential_helper.get_api_key())

    current_datetime = datetime.now()
    video_search_params = {
        "q": "fakesearch",
        "part": "id,snippet",
        "type": "video",
        "maxResults": 50,
        "publishedAfter": (current_datetime - timedelta(days=2)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),  # format required 1970-01-01T00:00:00Z
    }

    publish_time = current_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
    test_item = {
        "kind": "youtube#searchResult",
        "id": {"kind": "youtube#video", "videoId": "fakeVideo1"},
        "snippet": {"publishTime": publish_time},
    }

    mock_youtube_resource.build.return_value.search.return_value.list.return_value.execute.return_value = {
        "items": [test_item]
    }

    request = youtube.search().list(**video_search_params)
    response = request.execute()
    mock_youtube_resource.build.return_value.search.assert_called_once()
    mock_youtube_resource.build.return_value.search.return_value.list.assert_called_once_with(**video_search_params)
    assert response["items"] == [test_item]
