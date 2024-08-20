#!/usr/bin/env node
/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

import * as appreg_alpha from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import * as cdk from 'aws-cdk-lib';
import { aws_servicecatalogappregistry as appreg } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import * as crypto from 'crypto';

export class AppRegistry extends Construct implements cdk.IAspect {
    /**
     * Name of the solution as set through from cdk.json
     */
    private solutionName: string;

    /**
     * Name of the application used to create an entry in AppRegistry as set through cdk.json
     */
    private applicationName: string;

    /**
     * Solution ID as set through cdk.json
     */
    private solutionID: string;

    /**
     * Solution version as set through cdk.json
     */
    private solutionVersion: string;

    /**
     * An application type attribute initialized in the constructor of this class
     */
    private applicationType: string;

    /**
     * The instance of application that the solution stacks should be associated with
     */
    private application: appreg_alpha.Application;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.solutionName = scope.node.tryGetContext('solution_name');
        this.applicationName = scope.node.tryGetContext('app_registry_name');
        this.solutionID = scope.node.tryGetContext('solution_id');
        this.solutionVersion = scope.node.tryGetContext('solution_version');
        this.applicationType = scope.node.tryGetContext('application_type');
    }

    /**
     * Method invoked as a `Visitor` pattern to inject aspects during cdk synthesis
     *
     * @param node
     */
    public visit(node: IConstruct): void {
        if (node instanceof cdk.Stack) {
            if (!node.nested) {
                // parent stack
                const stack = node as cdk.Stack;
                this.createAppForAppRegistry();
                this.application.associateApplicationWithStack(stack);
                this.createAttributeGroup();
                this.addTagsforApplication();
            }
        }

        if (node instanceof cdk.NestedStack) {
            if (!this.application) {
                this.createAppForAppRegistry();
            }

            const nestedStack = node as cdk.NestedStack;
            const hash = crypto.createHash('sha256');
            hash.update(cdk.Names.nodeUniqueId(nestedStack.node));

            const nestedStackResourceAssociation = new appreg.CfnResourceAssociation(
                this,
                `ResourceAssociation${hash.digest('hex').slice(0, 12)}`,
                {
                    application: this.application.applicationId,
                    resource: node.stackId,
                    resourceType: 'CFN_STACK'
                }
            );

            const cfnNestedStackResource = nestedStack.nestedStackResource as cdk.CfnResource;
            if (cfnNestedStackResource.hasOwnProperty('cfnOptions')) {
                nestedStackResourceAssociation.cfnOptions.condition = cfnNestedStackResource.cfnOptions.condition;
            }
        }
    }

    /**
     * Method to initialize an Application in AppRegistry service
     *
     * @returns - Instance of AppRegistry's Application class
     */
    private createAppForAppRegistry(): void {
        this.application = new appreg_alpha.Application(this, 'RegistrySetup', {
            applicationName: cdk.Fn.join('-', ['App', cdk.Aws.STACK_NAME, this.applicationName]),
            description: `Service Catalog application to track and manage all your resources for the solution ${this.solutionName}`
        });
    }

    /**
     * Method to add tags to the AppRegistry's Application instance
     *
     */
    private addTagsforApplication(): void {
        if (!this.application) {
            this.createAppForAppRegistry();
        }
        cdk.Tags.of(this.application).add('Solutions:SolutionID', this.solutionID);
        cdk.Tags.of(this.application).add('Solutions:SolutionName', this.solutionName);
        cdk.Tags.of(this.application).add('Solutions:SolutionVersion', this.solutionVersion);
        cdk.Tags.of(this.application).add('Solutions:ApplicationType', this.applicationType);
    }

    /**
     * Method to create AttributeGroup to be associated with the Application's instance in AppRegistry
     *
     */
    private createAttributeGroup(): void {
        if (!this.application) {
            this.createAppForAppRegistry();
        }
        const attrGroup = new appreg_alpha.AttributeGroup(this, 'AppAttributes', {
            attributeGroupName: `AttrGrp-${cdk.Aws.STACK_NAME}`,
            description: 'Attributes for Solutions Metadata',
            attributes: {
                applicationType: this.applicationType,
                version: this.solutionVersion,
                solutionID: this.solutionID,
                solutionName: this.solutionName
            }
        });
        attrGroup.associateWith(this.application);
    }
}
