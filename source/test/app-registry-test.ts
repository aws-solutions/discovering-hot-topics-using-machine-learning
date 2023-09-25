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

import * as cdk from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { AppRegistry } from '../lib/aspects/app-registry';
import { DiscoveringHotTopicsStack } from '../lib/discovering-hot-topics-stack';

describe('When Solution Stack with a nested stack is registered with AppRegistry', () => {
    let template: Template;
    let app: cdk.App;
    const appRegApplicationCapture = new Capture();

    beforeAll(() => {
        app = new cdk.App({
            context: {
                solution_id: 'SO0122',
                solution_name: '%%SOLUTION_NAME%%',
                solution_version: '%%VERSION%%',
                app_registry_name: '%%APP_REG_NAME%%',
                attribute_group_name: 'Solutions-Metadata',
                application_type: 'AWS-Solutions'
            }
        });

        const stack = new DiscoveringHotTopicsStack(app, 'TestStack', { description: 'Some fake description to test' });
        // new cdk.NestedStack(stack, 'TestNestedStack');
        cdk.Aspects.of(app).add(new AppRegistry(stack, 'AppRegistryApect'));
        template = Template.fromStack(stack);
    });

    it('should create a ServiceCatalogueRegistry Application', () => {
        expect(app.node.tryGetContext('app_registry_name')).toStrictEqual('%%APP_REG_NAME%%');
        expect(app.node.tryGetContext('solution_name')).toStrictEqual('%%SOLUTION_NAME%%');
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::Application', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::Application', {
            Name: {
                'Fn::Join': [
                    '-',
                    [
                        'App',
                        app.node.tryGetContext('app_registry_name'),
                        { Ref: 'AWS::Region' },
                        { Ref: 'AWS::AccountId' }
                    ]
                ]
            },
            Description:
                'Service Catalog application to track and manage all your resources for the solution %%SOLUTION_NAME%%',
            Tags: {
                'Solutions:ApplicationType': 'AWS-Solutions',
                'Solutions:SolutionID': 'SO0122',
                'Solutions:SolutionName': '%%SOLUTION_NAME%%',
                'Solutions:SolutionVersion': '%%VERSION%%'
            }
        });
    });

    it('should create ResourceAssocation with nested stack', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::ResourceAssociation', 6);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
            Application: {
                'Fn::GetAtt': [appRegApplicationCapture, 'Id']
            },
            Resource: {
                Ref: 'AWS::StackId'
            },
            ResourceType: 'CFN_STACK'
        });
    });

    it('should have AttributeGroupAssociation', () => {
        const attGrpCapture = new Capture();
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::AttributeGroupAssociation', {
            Application: {
                'Fn::GetAtt': [appRegApplicationCapture.asString(), 'Id']
            },
            AttributeGroup: {
                'Fn::GetAtt': [attGrpCapture, 'Id']
            },
            Name: {
                'Fn::Join': [
                    '',
                    [
                        'AttrGrp-',
                        {
                            'Ref': 'AWS::StackName'
                        }
                    ]
                ]
            }
        });
        expect(template.toJSON()['Resources'][attGrpCapture.asString()]['Type']).toStrictEqual(
            'AWS::ServiceCatalogAppRegistry::AttributeGroup'
        );
    });

    it('should have AttributeGroup', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::AttributeGroup', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::AttributeGroup', {
            Attributes: {
                applicationType: app.node.tryGetContext('application_type'),
                version: app.node.tryGetContext('solution_version'),
                solutionID: app.node.tryGetContext('solution_id'),
                solutionName: app.node.tryGetContext('solution_name')
            }
        });
    });
});

describe('When Solution Stack with no nested stack is registered with AppRegistry', () => {
    let template: Template;
    let app: cdk.App;

    beforeAll(() => {
        app = new cdk.App({
            context: {
                solution_id: 'SO0122',
                solution_name: '%%SOLUTION_NAME%%',
                solution_version: '%%VERSION%%',
                app_registry_name: '%%APP_REG_NAME%%',
                attribute_group_name: 'Solutions-Metadata',
                application_type: 'AWS-Solutions'
            }
        });

        const stack = new cdk.Stack(app, 'TestStack');
        cdk.Aspects.of(app).add(new AppRegistry(stack, 'AppRegistryApect'));
        template = Template.fromStack(stack);
    });

    it('should create a ServiceCatalogueRegistry Application', () => {
        expect(app.node.tryGetContext('app_registry_name')).toStrictEqual('%%APP_REG_NAME%%');
        expect(app.node.tryGetContext('solution_name')).toStrictEqual('%%SOLUTION_NAME%%');
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::Application', 1);
        template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::Application', {
            Name: {
                'Fn::Join': [
                    '-',
                    [
                        'App',
                        app.node.tryGetContext('app_registry_name'),
                        { Ref: 'AWS::Region' },
                        { Ref: 'AWS::AccountId' }
                    ]
                ]
            },
            Description:
                'Service Catalog application to track and manage all your resources for the solution %%SOLUTION_NAME%%',
            Tags: {
                'Solutions:ApplicationType': 'AWS-Solutions',
                'Solutions:SolutionID': 'SO0122',
                'Solutions:SolutionName': '%%SOLUTION_NAME%%',
                'Solutions:SolutionVersion': '%%VERSION%%'
            }
        });
    });

    it('should not have ResourceAssocation for nested stack', () => {
        template.resourceCountIs('AWS::ServiceCatalogAppRegistry::ResourceAssociation', 1);
    });
});
