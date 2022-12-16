#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from '@aws-cdk/core';
import * as applicationinsights from '@aws-cdk/aws-applicationinsights';
import * as appreg from '@aws-cdk/aws-servicecatalogappregistry';
import * as crypto from 'crypto';

export class AppRegistry extends cdk.Construct implements cdk.IAspect {
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
     * An AttributeGroupName initialized in the constructor of this class
     */
    private attributeGroupName: string;

    /**
     * An application type attribute initialized in the constructor of this class
     */
    private applicationType: string;

    /**
     * The instance of application that the solution stacks should be associated with
     */
    private application: appreg.Application;

    constructor(scope: cdk.Construct, id: string) {
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
    public visit(node: cdk.IConstruct): void {
        if (node instanceof cdk.Stack) {
            if (!node.nested) {
                // parent stack
                const stack = node as cdk.Stack;
                this.createAppForAppRegistry();
                this.application.associateStack(stack);
                this.createAttributeGroup();
                this.addTagsforApplication();
            }
        }

        if (node instanceof cdk.NestedStack) {
            if (!this.application) {
                this.createAppForAppRegistry();
            }

            const stack = node as cdk.NestedStack;

            const nestedStackResourceAssociation = new appreg.CfnResourceAssociation(
                this,
                `ResourceAssociation${crypto.randomUUID()}`,
                {
                    application: this.application.applicationId,
                    resource: node.stackId,
                    resourceType: 'CFN_STACK'
                }
            );

            const cfnNestedStackResource = stack.nestedStackResource as cdk.CfnResource;
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
        this.application = new appreg.Application(this, 'RegistrySetup', {
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
        this.application.associateAttributeGroup(
            new appreg.AttributeGroup(this, 'AppAttributes', {
                attributeGroupName: `AttrGrp-${cdk.Aws.STACK_NAME}`,
                description: 'Attributes for Solutions Metadata',
                attributes: {
                    applicationType: this.applicationType,
                    version: this.solutionVersion,
                    solutionID: this.solutionID,
                    solutionName: this.solutionName
                }
            })
        );
    }
}

