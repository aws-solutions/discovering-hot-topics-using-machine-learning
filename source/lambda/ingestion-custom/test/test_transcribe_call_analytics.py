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

import os
import json
import pytest
from botocore.stub import Stubber, ANY
from unittest import mock
from moto import mock_s3, mock_kinesis

from shared_util.custom_logging import get_logger

from file_processor.file_processor import ACCOUNT_NAME, CREATED_DATE, ID, LANG, PLATFORM, TEXT, IncorrectEnvSetup
from file_processor.json_extn import LIST_SELECTOR
from file_processor.transcribe_call_analytics import (
    TranscribeCallAnalyticsProcessor,
    TranscribeCallAnalyticsBuilder,
    SENTIMENT,
)

from test.test_s3_util import MOCK_BUCKET, MOCK_CALL_ANALYTICS_FILE_PREFIX, s3_setup, s3_tear_down
from test.test_lambda_function import stream_setup, stream_tear_down

logger = get_logger(__name__)

event_bus_stubber = None


def env_patcher_dict():
    """
    Method that setups environment variables for creation of 'Processor' instance.
    These values are based on the mock_data_file.xlsx file the fixtures directory.
    Any structural changes to that file would need updating this dictionary
    """
    return {
        LIST_SELECTOR: "Transcript",
        ID: "GENERATE",
        CREATED_DATE: "NOW",
        TEXT: "Content",
        LANG: "LanguageCode",
        ACCOUNT_NAME: "fakeaccount",
        PLATFORM: "fakeplatform",
        SENTIMENT: "Sentiment",
        "INTEGRATION_BUS_NAME": "fakebus",
        "NAMESPACE": "fakenamespace",
    }


@pytest.fixture
def get_event_bus_stubber():
    global event_bus_stubber
    from shared_util.service_helper import get_service_client

    if not event_bus_stubber:
        event_bus_client = get_service_client("events")
        event_bus_stubber = Stubber(event_bus_client)
    return event_bus_stubber


@pytest.fixture
@mock.patch.dict(os.environ, env_patcher_dict())
def get_transcribe_analytics_processor():
    return TranscribeCallAnalyticsProcessor(
        os.environ[ID],
        os.environ[CREATED_DATE],
        os.environ[TEXT],
        os.environ[LANG],
        os.environ[ACCOUNT_NAME],
        os.environ[PLATFORM],
        os.environ[SENTIMENT],
        os.environ[LIST_SELECTOR],
    )


@mock_s3()
@mock_kinesis()
@mock.patch.dict(os.environ, env_patcher_dict())
def test_process_call_analytics_file(get_event_bus_stubber, get_transcribe_analytics_processor):
    s3_setup()
    stream_setup(os.environ["STREAM_NAME"])
    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
        {
            "Entries": [
                {
                    "EventBusName": os.environ["INTEGRATION_BUS_NAME"],
                    "Source": os.environ["NAMESPACE"],
                    "Detail": ANY,
                    "DetailType": "TRANSCRIBE_METADATA",
                }
            ]
        },
    )
    get_event_bus_stubber.activate()

    get_transcribe_analytics_processor.process_file(MOCK_BUCKET, MOCK_CALL_ANALYTICS_FILE_PREFIX)
    s3_tear_down()
    stream_tear_down(os.environ["STREAM_NAME"])
    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock_s3()
@mock_kinesis()
@mock.patch.dict(os.environ, env_patcher_dict())
def test_parent_id_not_set(get_event_bus_stubber):
    s3_setup()
    stream_setup(os.environ["STREAM_NAME"])
    get_event_bus_stubber.add_response(
        "put_events",
        {"Entries": [{"EventId": "fakeeventid"}], "FailedEntryCount": 0},
        {
            "Entries": [
                {
                    "EventBusName": os.environ["INTEGRATION_BUS_NAME"],
                    "Source": os.environ["NAMESPACE"],
                    "Detail": ANY,
                    "DetailType": "TRANSCRIBE_METADATA",
                }
            ]
        },
    )
    get_event_bus_stubber.activate()

    # delete environment variable that triggers parent_id uuidv4 generation
    del os.environ["ID"]

    processor = TranscribeCallAnalyticsProcessor(
        None,
        os.environ[CREATED_DATE],
        os.environ[TEXT],
        os.environ[LANG],
        os.environ[ACCOUNT_NAME],
        os.environ[PLATFORM],
        os.environ[SENTIMENT],
        os.environ[LIST_SELECTOR],
    )

    processor.process_file(MOCK_BUCKET, MOCK_CALL_ANALYTICS_FILE_PREFIX)
    s3_tear_down()
    stream_tear_down(os.environ["STREAM_NAME"])
    get_event_bus_stubber.assert_no_pending_responses()
    get_event_bus_stubber.deactivate()


@mock.patch.dict(os.environ, env_patcher_dict())
def test_auxillary_processing_callback_with_no_parent_id(get_transcribe_analytics_processor):
    with open(os.path.join(os.path.dirname(__file__), "fixtures", MOCK_CALL_ANALYTICS_FILE_PREFIX)) as json_file:
        source_json_data = json.load(json_file)
        del source_json_data[os.environ[LIST_SELECTOR]]
        with pytest.raises(ValueError):
            get_transcribe_analytics_processor.auxillary_processing_callback(source_json_data, parent_id=None)


def test_fail_trascribe_call_analytics_builder_failure():
    with pytest.raises(IncorrectEnvSetup):
        with mock.patch.dict(os.environ, env_patcher_dict()):
            del os.environ[SENTIMENT]
            builder = TranscribeCallAnalyticsBuilder()
            builder()

    with mock.patch.dict(os.environ, env_patcher_dict()):
        builder = TranscribeCallAnalyticsBuilder()
        assert isinstance(builder(), TranscribeCallAnalyticsProcessor)

    with pytest.raises(IncorrectEnvSetup):
        with mock.patch.dict(os.environ, env_patcher_dict()):
            del os.environ[LIST_SELECTOR]
            builder = TranscribeCallAnalyticsBuilder()
            builder()


@mock.patch.dict(os.environ, env_patcher_dict())
def test_mock_env_setup():
    # test if the mock.patch for environment variables has been patched correctly
    assert os.environ[LIST_SELECTOR] == "Transcript"
    assert os.environ[ID] == "GENERATE"
    assert os.environ[CREATED_DATE] == "NOW"
    assert os.environ[TEXT] == "Content"
    assert os.environ[LANG] == "LanguageCode"
    assert os.environ[ACCOUNT_NAME] == "fakeaccount"
    assert os.environ[PLATFORM] == "fakeplatform"
    assert os.environ[SENTIMENT] == "Sentiment"


@mock.patch.dict(os.environ, env_patcher_dict())
def test_retrieving_process_instance():
    # check if builder is able to return instance successfully
    builder = TranscribeCallAnalyticsBuilder()
    assert True == isinstance(builder, TranscribeCallAnalyticsBuilder)
    assert True == isinstance(builder(), TranscribeCallAnalyticsProcessor)
