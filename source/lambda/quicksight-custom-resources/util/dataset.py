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
from shared_util import custom_logging
from tenacity import retry, retry_if_exception_type, stop_after_attempt

from util.helpers import get_quicksight_client
from util.quicksight_resource import QuickSightFailure, QuickSightResource

logger = custom_logging.get_logger(__name__)


class DataSet(QuickSightResource):
    def __init__(self, quicksight_application=None, data_source=None, data_set_sub_type=None, props=None):
        super().__init__(
            quicksight_application=quicksight_application, type="dataset", sub_type=data_set_sub_type, props=props
        )
        self.use_props(props)

        self.data_source = data_source

        # override to set schema name directly
        # instead of using the one in the config file
        self.schema = None

        self.config_data = dict()
        self._load_config(self.type, quicksight_application.get_supported_data_set_sub_types(), self.config_data)

    def create(self):
        if not self.data_source:
            raise ValueError("missing datasource value when creating dataset")
        logger.info(f"creating quicksight dataset id:{self.id}")
        physical_table_map = self._get_map(self.sub_type, "PhysicalTableMap")
        logical_table_map = self._get_map(self.sub_type, "LogicalTableMap")
        column_groups_map = self._get_map(self.sub_type, "ColumnGroups")
        response = self._create_data_set(physical_table_map, logical_table_map, column_groups_map)
        return response

    def delete(self):
        logger.info(f"deleting quicksight dataset id:{self.id}")
        quicksight_client = get_quicksight_client()

        response = quicksight_client.delete_data_set(AwsAccountId=self.aws_account_id, DataSetId=self.id)
        logger.info(f"finished deleting quicksight dataset for id:{self.id}, response:{response}")

        self.arn = response["Arn"]
        return response

    @retry(retry=retry_if_exception_type(QuickSightFailure), stop=stop_after_attempt(3))
    def _create_data_set(self, physical_table_map, logical_table_map, column_groups_map):
        quicksight_client = get_quicksight_client()

        self._update_data_source_arn(physical_table_map)
        self._update_schema(physical_table_map)

        params = dict(
            AwsAccountId=self.aws_account_id,
            DataSetId=self.id,
            Name=self.name,
            Permissions=self._get_permissions(),
            PhysicalTableMap=physical_table_map,
            LogicalTableMap=logical_table_map,
            ImportMode="DIRECT_QUERY",
        )

        if self.sub_type in ["feed"]:
            params.update({"ColumnGroups": column_groups_map})
        try:
            logger.info(f"Params for creating the dataset for id:{self.id}:: {params}")
            response = quicksight_client.create_data_set(**params)
            logger.info(f"finished creating quicksight create_data_set id:{self.id}, response:{response}")
        except quicksight_client.exceptions.ResourceExistsException:
            logger.info(f"dataset for id:{self.id} already exists")
            response = quicksight_client.describe_data_set(AwsAccountId=self.aws_account_id, DataSetId=self.id)
            response = response["DataSet"]
        except quicksight_client.exceptions.InvalidParameterValueException as exc:
            logger.error(str(exc))
            raise QuickSightFailure()

        self.arn = response["Arn"]
        return response

    def _get_permissions(self):
        # The principal is the owner of the resource and create the resources and is given full actions for the type
        permissions = [
            {
                "Principal": self.principal_arn,
                "Actions": [
                    "quicksight:DescribeDataSet",
                    "quicksight:DescribeDataSetPermissions",
                    "quicksight:PassDataSet",
                    "quicksight:DescribeIngestion",
                    "quicksight:ListIngestions",
                    "quicksight:UpdateDataSet",
                    "quicksight:DeleteDataSet",
                    "quicksight:CreateIngestion",
                    "quicksight:CancelIngestion",
                    "quicksight:UpdateDataSetPermissions",
                ],
            }
        ]
        return permissions

    def _update_schema(self, obj):
        if not self.schema:
            logger.debug(
                f"Schema name is not set in object. Using the ones from config file as is in RelationalTable[].Schema in PhysicalTableMap"
            )
            return
        for (key, value) in obj.items():
            if "RelationalTable" in value:
                logger.debug(f"Updating schema arn value of RelationalTable.Schema in {key} PhysicalTableMap")
                value["RelationalTable"]["Schema"] = self.schema

    def _update_data_source_arn(self, obj):
        for (key, value) in obj.items():
            if "RelationalTable" in value:
                logger.debug(
                    f"Updating datasource arn value of RelationalTable.DataSourceArn in {key} PhysicalTableMap"
                )
                value["RelationalTable"]["DataSourceArn"] = self.data_source.arn
            elif "CustomSql" in value:
                logger.debug(f"Updating datasource arn value of CustomSql.DataSourceArn in {key} PhysicalTableMap")
                value["CustomSql"]["DataSourceArn"] = self.data_source.arn
