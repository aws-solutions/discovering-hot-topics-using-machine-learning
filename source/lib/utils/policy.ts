#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

/**
 * Function to add to logging bucket's resource policy
 */
export function updateBucketResourcePolicy(
    s3LoggingBucket: s3.Bucket,
    sourceBucket: s3.Bucket,
    sourcePrefix: string
): any {
    s3LoggingBucket.addToResourcePolicy(
        new iam.PolicyStatement({
            sid: `${sourcePrefix}AccessLogsPolicy`,
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('logging.s3.amazonaws.com')],
            actions: ['s3:PutObject'],
            resources: [`${s3LoggingBucket.bucketArn}/${sourcePrefix}*`],
            conditions: {
                ArnLike: {
                    'aws:SourceArn': [`${sourceBucket.bucketArn}`]
                },
                StringEquals: {
                    'aws:SourceAccount': cdk.Aws.ACCOUNT_ID
                }
            }
        })
    );
}
