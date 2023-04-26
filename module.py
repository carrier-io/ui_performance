#!/usr/bin/python3
# coding=utf-8

#   Copyright 2022 getcarrier.io
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

""" Module """

from pylon.core.tools import log  # pylint: disable=E0611,E0401
from pylon.core.tools import module  # pylint: disable=E0611,E0401

from .init_db import init_db
from tools import theme, shared


class Module(module.ModuleModel):
    """ Task module """

    def __init__(self, context, descriptor):
        self.context = context
        self.descriptor = descriptor

    def init(self):
        """ Init module """
        log.info('Initializing module')
        init_db()

        self.descriptor.init_api()

        self.descriptor.init_rpcs()

        self.descriptor.init_blueprint()

        try:
            theme.register_section(
                "performance",
                "Performance",
                kind="holder",
                location="left",
                permissions={
                    "permissions": ["performance"],
                    "recommended_roles": {
                        "administration": {"admin": True, "editor": True, "viewer": False},
                        "default": {"admin": True, "editor": True, "viewer": False},
                    }
                }
            )
        except:
            ...

        theme.register_subsection(
            "performance", "ui",
            "UI",
            title="UI performance",
            kind="slot",
            prefix="ui_performance_",
            weight=5,
            permissions={
                "permissions": ["performance.ui_performance"],
                "recommended_roles": {
                    "administration": {"admin": True, "editor": True, "viewer": False},
                    "default": {"admin": True, "editor": True, "viewer": False},
                }
            }
        )

        theme.register_page(
            "performance", "ui",
            "results",
            title="UI Test Results",
            kind="slot",
            prefix="ui_results_",
            permissions={
                "permissions": ["performance.ui_performance_results"],
                "recommended_roles": {
                    "administration": {"admin": True, "editor": True, "viewer": False},
                    "default": {"admin": True, "editor": True, "viewer": False},
                }
            }
        )

        self.context.rpc_manager.call.integrations_register_section(
            name='Processing',
            integration_description='Manage processing',
            test_planner_description='Specify processing tools. You may also set processors in <a '
                                     'href="{}">Integrations</a> '.format(
                '/-/configuration/integrations/')
        )

        self.context.rpc_manager.call.integrations_register(
            name='quality_gate',
            section='Processing',
        )

        self.descriptor.init_slots()

        shared.job_type_rpcs.add('ui_performance')

    def deinit(self):  # pylint: disable=R0201
        """ De-init module """
        log.info('De-initializing module')
