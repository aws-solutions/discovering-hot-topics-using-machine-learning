######################################################################################################################
#  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      #
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

from setuptools import find_packages, setup

setup(
    name="python_lambda_layer",
    version="1.5",
    description="Initialize boto config for AWS Python SDK with custom configuration",
    url="https://github.com/awslabs/discovering-hot-topics-using-machine-learning",
    author="aws-solutions-builder",
    author_email="aws-solutions-builder@amazon.com",
    license="Apache 2.0",
    packages=find_packages(),
)
