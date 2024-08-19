#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

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
