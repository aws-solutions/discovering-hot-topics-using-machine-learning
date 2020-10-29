/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICNSE-2.0                                                                     *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { QuickSightStack } from '../lib/quicksight-custom-resources/quicksight-stack';

test('test QuickSight stackCreation', () => {
    const stack = new Stack();
    new QuickSightStack(stack, 'testQuickSight');
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveOutput({
        outputName: 'discoveringhottopicsusingmachinelearningQSDashboardQuicksightQuickSightResources06DCADD4analysisurl',
        outputValue: {
            'Fn::GetAtt': [
                "QuicksightQuickSightResources2C63FCCA",
                "analysis_url"
            ]
        }
    });
    expect(stack).toHaveOutput({
        outputName: 'discoveringhottopicsusingmachinelearningQSDashboardQuicksightQuickSightResources06DCADD4dashboardurl',
        outputValue: {
            'Fn::GetAtt': [
                "QuicksightQuickSightResources2C63FCCA",
                "dashboard_url"
            ]
        }
    });
});