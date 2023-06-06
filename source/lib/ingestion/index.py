import json
import logging
import os
import uuid

import boto3
import cfnresponse

RESOURCE_PROPERTIES = "ResourceProperties"
SOURCE_BUCKET_NAME = "SOURCE_BUCKET_NAME"
LOGGING_BUCKET_NAME = "LOGGING_BUCKET_NAME"
PHYSICAL_RESOURCE_ID = "PhysicalResourceId"
POLICY_SID = "customingestionAccessLogsPolicy"
STATEMENT = "Statement"

DEFAULT_LEVEL = "DEBUG"

s3 = boto3.client("s3")
logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", DEFAULT_LEVEL))


def handler(event, context):
    logger.debug(f"The event is {event}")
    physical_resource_id = None

    try:
        physical_resource_id = event.get(PHYSICAL_RESOURCE_ID, uuid.uuid4().hex[:8])

        if event["RequestType"] == "Create" or event["RequestType"] == "Update":
            source_bucket_name = event[RESOURCE_PROPERTIES][SOURCE_BUCKET_NAME]
            logging_bucket_name = event[RESOURCE_PROPERTIES][LOGGING_BUCKET_NAME]
            account_id = context.invoked_function_arn.split(":")[4]
            aws_partition = context.invoked_function_arn.split(":")[1]

            s3.put_public_access_block(
                Bucket=logging_bucket_name,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": False,
                    "RestrictPublicBuckets": True,
                },
                ExpectedBucketOwner=account_id,
            )

            policy_string = s3.get_bucket_policy(Bucket=logging_bucket_name)["Policy"]
            bucket_policy = json.loads(policy_string)

            update_policy = True

            for statement in bucket_policy[STATEMENT]:
                logger.debug(f"Statement is {json.dumps(statement)}")
                if "Sid" in statement and statement["Sid"] == POLICY_SID:
                    if (
                        f"arn:{aws_partition}:s3:::{source_bucket_name}"
                        not in statement["Condition"]["ArnLike"]["aws:SourceArn"]
                    ):
                        logger.info("Bucket policy exists but with a different bucket, hence removing it")
                        bucket_policy[STATEMENT].remove(statement)
                        break
                    else:
                        logger.info("Bucket policy exists, hence update not required")
                        update_policy = False
                        break

            if update_policy:
                bucket_policy[STATEMENT].append(
                    {
                        "Action": "s3:PutObject",
                        "Condition": {
                            "ArnLike": {"aws:SourceArn": [f"arn:{aws_partition}:s3:::{source_bucket_name}"]},
                            "StringEquals": {"aws:SourceAccount": account_id},
                        },
                        "Effect": "Allow",
                        "Principal": {"Service": "logging.s3.amazonaws.com"},
                        "Resource": f"arn:{aws_partition}:s3:::{logging_bucket_name}/customingestion*",
                        "Sid": POLICY_SID,
                    }
                )

                s3.put_bucket_policy(Bucket=logging_bucket_name, Policy=json.dumps(bucket_policy))

            s3.put_public_access_block(
                Bucket=logging_bucket_name,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True,
                    "RestrictPublicBuckets": True,
                },
                ExpectedBucketOwner=account_id,
            )
            logger.info("Policy Updated successfully. Sending success response to CloudFormation")

        cfnresponse.send(event, context, cfnresponse.SUCCESS, {}, physical_resource_id)
    except Exception as ex:
        logger.error(f"Failed to update policy, error is {str(ex)}")
        cfnresponse.send(
            event, context, cfnresponse.FAILED, {}, physicalResourceId=physical_resource_id, reason=str(ex)
        )
