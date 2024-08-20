######################################################################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
######################################################################################################################

from setuptools import find_packages, setup

setup(
    name="python_lambda_layer",
    version="2.1.3",
    description="Initialize boto config for AWS Python SDK with custom configuration",
    url="https://github.com/awslabs/discovering-hot-topics-using-machine-learning",
    author="aws-solutions-builder",
    author_email="aws-solutions-builder@amazon.com",
    license="Apache 2.0",
    packages=find_packages(),
)
