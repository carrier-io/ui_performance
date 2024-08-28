const ui_api_base_url = '/api/v1/ui_performance'
var ui_test_formatters = {
    name_uid(value, row) {
        return `
            <div>
                <p class="font-h5 mb-0 text-gray-800">${row.name}</p>
                <span class="font-weight-400 text-gray-600 font-h6">${row.test_uid}</span>
            </div>
        `
    },
    runner(value, row, index) {
        switch (value) {
            case 'Sitespeed (browsertime)':
                return '<img src="/design-system/static/assets/ico/sitespeed.png" width="20">'
            case 'Lighthouse':
            case 'Lighthouse-Nodejs':
                return '<img src="/design-system/static/assets/ico/lighthouse.png" width="20">'
            case 'Observer':
                return '<img src="/design-system/static/assets/ico/selenium.png" width="20">'
            default:
                return value
        }
    },

    actions(value, row, index) {
        return `
            <div class="d-flex justify-content-end">
                <button class="btn btn-default btn-xs btn-table btn-icon__xs test_run mr-2"
                    data-toggle="tooltip" data-placement="top" title="Run Test">
                    <i class="icon__18x18 icon-run"></i>
                </button>
                <div class="dropdown_multilevel">
                    <button class="btn btn-default btn-xs btn-table btn-icon__xs"
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class="icon__18x18 icon-menu-dots"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li class="dropdown-menu_item dropdown-item d-flex align-items-center">
                            <span class="w-100 font-h5 d-flex align-items-center"><i class="icon__18x18 icon-integrate mr-1"></i>Integrate with</span>
                            <i class="icon__16x16 icon-sort"></i>
                            <ul class="submenu dropdown-menu">
                                <li class="dropdown-menu_item dropdown-item d-flex align-items-center int_docker">
                                    <span class="w-100 font-h5">Docker command</span>
                                </li>
                            </ul>
                        </li>
                        <li class="dropdown-menu_item dropdown-item d-flex align-items-center test_edit">
                            <i class="icon__18x18 icon-settings mr-2"></i><span class="w-100 font-h5">Settings</span>
                        </li>
                        <li class="dropdown-menu_item dropdown-item d-flex align-items-center test_delete">
                            <i class="icon__18x18 icon-delete mr-2"></i><span class="w-100 font-h5">Delete</span>
                        </li>
                    </ul>
                </div>
                
            </div>
        `
    },
    name_style(value, row, index) {
        return {
            css: {
                "max-width": "140px",
                "overflow": "hidden",
                "text-overflow": "ellipsis",
                "white-space": "nowrap"
            }
        }
    },
    // cell_style(value, row, index) {
    //     return {
    //         css: {
    //             "min-width": "165px"
    //         }
    //     }
    // },
    action_events: {
        "click .test_run": function (e, value, row, index) {
            console.log('test_run', row)
            const component_proxy = vueVm.registered_components.run_modal
            component_proxy.set({...row, test_parameters: [...JSON.parse(JSON.stringify(row.test_parameters))]})
        },

        "click .test_edit": function (e, value, row, index) {
            console.log('test_edit', row)
            const component_proxy = vueVm.registered_components.create_modal
            component_proxy.mode = 'update'
            component_proxy.set(row)
        },

        "click .test_delete": function (e, value, row, index) {
            console.log('test_delete', row)
            ui_test_delete(row.id)
        },

        "click .int_docker": async function (e, value, row, index) {
            const resp = await fetch(`${ui_api_base_url}/test/${row.project_id}/${row.id}/?output=docker`)
            if (resp.ok) {
                const {cmd} = await resp.json()
                vueVm.docker_command.cmd = cmd
                vueVm.docker_command.is_open = true
            } else {
                showNotify('ERROR', 'Error getting docker command')
            }
        }

    }
}

var ui_report_formatters = {
    reportsStatusFormatter(value, row, index) {
        switch (value.status.toLowerCase()) {
            case 'error':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--red)"><i class="fas fa-exclamation-circle error"></i> ${value.status}</div>`
            case 'failed':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--red)"><i class="fas fa-exclamation-circle error"></i> ${value.status}</div>`
            case 'success':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--green)"><i class="fas fa-exclamation-circle error"></i> ${value.status}</div>`
            case 'cancelled':
            case 'canceled':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--gray)"><i class="fas fa-times-circle"></i> ${value.status}</div>`
            case 'finished':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--info)"><i class="fas fa-check-circle"></i> ${value.status}</div>`
            case 'in progress':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value.status}</div>`
            case 'post processing':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value.status}</div>`
            case 'pending...':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value.status}</div>`
            case 'preparing...':
                return `<div data-toggle="tooltip" data-placement="top" title="${value.description}" style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value.status}</div>`
            default:
                return value.status.toLowerCase()
        }
    },
    createLinkToTest(value, row, index) {
        return `<a class="test form-control-label font-h5" href="./results?result_id=${row.id}" role="button">${row.name}</a>`
    },
    date_formatter(value) {
        return new Date(value).toLocaleString()
    }
}

var ui_custom_params_table_formatters = {
    input(value, row, index, field) {
        if (['test_name', 'test_type', 'env_type'].includes(row.name)) {
            return `
                <input type="text" class="form-control form-control-alternative" disabled
                    onchange="ParamsTable.updateCell(this, ${index}, '${field}')" value="${value}">
                <div class="invalid-tooltip invalid-tooltip-custom"></div>
            `
        }
        return ParamsTable.inputFormatter(value, row, index, field)

    },
    action(value, row, index, field) {
        if (['test_name', 'test_type', 'env_type'].includes(row.name)) {
            return ''
        }
        return ParamsTable.parametersDeleteFormatter(value, row, index)
    }
}


const UiTestCreateModal = {
    delimiters: ['[[', ']]'],
    // components: {
    // Customization: Customization,
    // },
    props: ['modal_id', 'runners', 'test_params_id', 'source_card_id', 'locations'],
    template: `
<div class="modal modal-base fixed-left fade shadow-sm" tabindex="-1" role="dialog" :id="modal_id">
    <div class="modal-dialog modal-dialog-aside" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <div class="row w-100">
                    <div class="col">
                        <p class="font-h3 font-bold">[[ mode === 'create' ? 'Create' : 'Update' ]] UI Test</p>
                    </div>
                    <div class="col-xs">
                        <button type="button" class="btn btn-secondary mr-2" data-dismiss="modal" aria-label="Close">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-secondary mr-2" 
                            @click="() => mode === 'create' ? handleCreate(false) : handleUpdate(false)"
                        >
                            [[ mode === 'create' ? 'Save' : 'Update' ]]
                        </button>
                        <button type="button" class="btn btn-basic" 
                            @click="() => mode === 'create' ? handleCreate(true) : handleUpdate(true)"
                        >
                            [[ mode === 'create' ? 'Save and start' : 'Update and start' ]]
                        </button>
                    </div>
                </div>
            </div>
            
            <slot name='alert_bar'></slot>


            <div class="modal-body">
                <div class="section">
                    <div class="row">
                        <div class="col">
                            <div class="form-group">
                                <p class="font-h5 font-semibold">Test Name</p>
                                <p class="font-h6 font-weight-400">Enter a name that describes the purpose of your test.</p>
                                <div class="custom-input mb-3 mt-2" 
                                    :class="{'invalid-input': errors?.name}">
                                    <input type="text"
                                        placeholder="Test Name"
                                        :disabled="mode !== 'create'"
                                        v-model='name'
                                        :class="{ 'disabled': mode !== 'create'}"
                                    >
                                    <span class="input_error-msg">[[ get_error_msg('name') ]]</span>
                                </div>
                            </div>
                            <div class="d-flex">
                                <div class="flex-fill">
                                    <div class="form-group">
                                        <p class="font-h5 font-semibold">Test Type</p>
                                        <p class="font-h6 font-weight-400">Tag to group tests by type</p>
                                        <div class="custom-input mb-3 mt-2"
                                            :class="{ 'invalid-input': errors?.test_type }"
                                        >
                                            <input type="text" placeholder="Test Type"
                                                v-model='test_type'
                                            >
                                            <span class="input_error-msg">[[ get_error_msg('test_type') ]]</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-fill">
                                    <div class="form-group">
                                        <p class="font-h5 font-semibold">Environment</p>
                                        <p class="font-h6 font-weight-400">Tag to group tests by env</p>
                                        <div class="custom-input mb-3 mt-2"
                                            :class="{ 'invalid-input': errors?.env_type }"
                                        >
                                            <input type="text"
                                                placeholder="Test Environment"
                                                v-model='env_type'
                                            >
                                            <span class="input_error-msg">[[ get_error_msg('env_type') ]]</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <p class="font-h5 font-semibold">Test runner</p>
                                <p class="font-h6 font-weight-400">Choose the runner for the test.</p>
                                <div class="custom-input w-100-imp">
                                    <select class="selectpicker bootstrap-select__b displacement-ml-4 mt-2" data-style="btn" 
                                    v-model="runner"
                                    :class="{ 'is-invalid': errors?.runner }"
                                >
                                    
                                    <option v-for='runner in runners' :value="runner">
                                        [[ runner ]]
                                    </option>
                                </select>
                                </div>
                                <div class="invalid-feedback">[[ get_error_msg('runner') ]]</div>
                            </div>
                            
                            <div class="row">
                                <div class="form-group col-6 d-flex flex-column justify-content-end pr-2.25">
                                    <p class="font-h5 font-semibold">Number of loops</p>
                                    <p class="font-h6 font-weight-400">How many times to repeat test scenario.</p>
                                    <div class="custom-input mt-2"
                                        :class="{ 'invalid-input': errors?.loops }"
                                    >
                                        <input type="number" class="form-control-alternative"
                                               placeholder="# of loops" 
                                               v-model="loops"
                                               :class="{ 'is-invalid': errors?.loops }"
                                        >
                                        <div class="invalid-feedback">[[ get_error_msg('loops') ]]</div>
                                    </div>
                                </div>
                                    
                                <div class="form-group col-6 d-flex flex-column justify-content-end pl-2.25">
                                    <p class="font-h5 font-semibold">Aggregation</p>
                                    <p class="font-h6 font-weight-400">Aggregation rule</p>
                                    <div class="custom-input w-100-imp select-validation mt-2"
                                        :class="{ 'is-invalid': errors?.aggregation, 'invalid-select': errors?.aggregation }"
                                    >
                                        <select class="selectpicker bootstrap-select__b mt-1" data-style="btn" 
                                            v-model="aggregation"
                                        >
                                            <option value="max">Max</option>
                                            <option value="min">Min</option>
                                            <option value="avg">Avg</option>
                                        </select>
                                    </div>
                                    <div class="invalid-feedback select_error-msg">[[ get_error_msg('aggregation') ]]</div>
                                </div>
                            </div>
                        </div>
                               
                                
                        <div class="col">
                            <slot name='sources'></slot>
                            
                            <div class="form-group mt-3">
                                <div class="form-group">
                                    <label class="d-block">
                                        <p class="font-h5 font-semibold">Entrypoint</p>
                                        <p class="font-h6 font-weight-400">Script name</p>
                                        <input type="text" class="form-control form-control-alternative mt-2"
                                           placeholder="sitespeed.js"
                                           name="ui_entrypoint"
                                           v-model='entrypoint'
                                           :class="{ 'is-invalid': errors?.entrypoint }"
                                        >
                                        <div class="invalid-feedback">[[ get_error_msg('entrypoint') ]]</div>
                                    </label>
                                </div>
                            </div>
                            <div class="form-group mt-3">
                                <div class="form-group">
                                    <p class="font-h5 font-semibold">Custom CMD</p>
                                    <p class="font-h6 font-weight-400">You may also add a command for test runner</p>
                                    <input type="text" class="form-control form-control-alternative mt-2"
                                           placeholder="Custom CMD"
                                           v-model='custom_cmd'
                                           :class="{ 'is-invalid': errors?.custom_cmd }"
                                           >
                                           <div class="invalid-feedback">[[ get_error_msg('custom_cmd') ]]</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                
                <UILocations 
                    v-model:location="location"
                    v-model:parallel_runners="parallel_runners"
                    v-model:cpu="cpu_quota"
                    v-model:memory="memory_quota"
                    v-model:cloud_settings="cloud_settings"
                    
                    modal_id="ui"
                    
                    v-bind="locations"
                    ref="locations"
                ></UILocations>
                
                <slot name='params_table'></slot>
                <slot name='integrations'></slot>
                <slot name='schedules'></slot>
                
            </div>
        </div>
    </div>
</div>
    `,
    data() {
        return this.initial_state()
    },
    mounted() {
        $(this.$el).on('hide.bs.modal', this.clear)
        $(this.$el).on('show.bs.modal', this.$refs.locations.fetch_locations)
        this.runner = this.default_runner
        $(this.source.el).find('a.nav-item').on('click', e => {
                this.active_source_tab = this.source.get_active_tab(e.target.id)
            }
        )
    },
    computed: {
        default_runner() {
            return this.$props.runners &&
            this.$props.runners.includes('Sitespeed (browsertime)') ?
                'Sitespeed (browsertime)' :
                this.$props.runners[0]
                || null
        },
        test_parameters() {
            return ParamsTable.Manager(this.$props.test_params_id)
        },
        source() {
            return SourceCard.Manager(this.$props.source_card_id)
        },
        integrations() {
            try {
                return IntegrationSection.Manager()
            } catch (e) {
                console.warn('No integration section')
                return undefined
            }
        },
        schedules() {
            try {
                return SchedulingSection.Manager()
            } catch (e) {
                console.warn('No scheduling section')
                return undefined
            }
        },
        lighthouse_selected() {
            return this.runner?.toLowerCase().includes('lighthouse')
        }
    },
    watch: {
        errors(newValue,) {
            if (Object.keys(newValue).length > 0) {
                newValue.test_parameters ?
                    this.test_parameters.setError(newValue.test_parameters) :
                    this.test_parameters.clearErrors()
                newValue.source ?
                    this.source.setError(newValue.source) :
                    this.source.clearErrors()

                newValue.integrations ?
                    this.integrations?.setError(newValue.integrations) :
                    this.integrations?.clearErrors()

                newValue.schedules ?
                    this.schedules?.setError(newValue.schedules) :
                    this.schedules?.clearErrors()

                // newValue.customization && $(this.$refs.advanced_params).collapse('show')
            } else {
                this.test_parameters.clearErrors()
                this.source.clearErrors()
                this.integrations?.clearErrors()
                this.schedules?.clearErrors()
            }
        },
    },
    methods: {
        get_error_msg(field_name) {
            return this.errors[field_name]?.reduce((acc, item) => {
                return acc === '' ? item.msg : [acc, item.msg].join('; ')
            }, '')
        },
        compareObjectsDiff(o1, o2 = {}, required_fields) {
            return Object.keys(o2).reduce((diff, key) => {
                if (o1[key] !== o2[key] || required_fields.includes(key)) {
                    return {
                        ...diff,
                        [key]: o2[key]
                    }
                } else {
                    return diff
                }
            }, {})
        },
        get_data() {

            const data = {
                common_params: {
                    name: this.name,
                    test_type: this.test_type,
                    env_type: this.env_type,
                    entrypoint: this.entrypoint,
                    runner: this.runner,
                    source: this.source.get(),
                    env_vars: {
                        cpu_quota: this.cpu_quota,
                        memory_quota: this.memory_quota,
                        ENV: this.env_type["default"],
                        cloud_settings: this.compareObjectsDiff(
                            this.$refs.locations.chosen_location_settings,
                            this.cloud_settings,
                            ["id", "integration_name", "project_id", "instance_type", "ec2_instance_type"]
                        ),
                        custom_cmd: this.custom_cmd
                    },
                    // parallel_runners: this.parallel_runners,
                    parallel_runners: 1,
                    cc_env_vars: {},
                    location: this.location
                    // customization: this.customization,
                },
                test_parameters: this.test_parameters.get(),
                integrations: this.integrations?.get() || {},
                schedules: this.schedules?.get() || [],
            }
            // if (!this.lighthouse_selected) {
            data.common_params.loops = this.loops
            data.common_params.aggregation = this.aggregation
            // }
            return data
        },
        // handle_advanced_params_icon(e) {
        //     this.advanced_params_icon = this.$refs.advanced_params.classList.contains('show') ?
        //         'fas fa-chevron-down' : 'fas fa-chevron-up'
        // },
        async handleCreate(run_test = false) {
            this.clearErrors()
            data = new FormData()
            data.append('data', JSON.stringify({...this.get_data(), run_test}))
            const source = this.source.get().file
            if (typeof source === 'object') {
                data.append('file', source)
            }

            const resp = await fetch(`${ui_api_base_url}/tests/${getSelectedProjectId()}`, {
                method: 'POST',
                body: data
            })
            if (resp.ok) {
                this.hide()
                vueVm.registered_components.table_tests?.table_action('refresh')
                vueVm.registered_components.table_tests_overview?.table_action('refresh')
                run_test && vueVm.registered_components.table_results?.table_action('refresh')
                run_test && vueVm.registered_components.table_reports_overview?.table_action('refresh')
            } else {
                await this.handleError(resp)
            }
        },
        async handleUpdate(run_test = false) {
            this.clearErrors()
            const resp = await fetch(`${ui_api_base_url}/test/${getSelectedProjectId()}/${this.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({...this.get_data(), run_test})
            })
            if (resp.ok) {
                this.hide()
                vueVm.registered_components.table_tests?.table_action('refresh')
                vueVm.registered_components.table_tests_overview?.table_action('refresh')
                run_test && vueVm.registered_components.table_results?.table_action('refresh')
                run_test && vueVm.registered_components.table_reports_overview?.table_action('refresh')
            } else {
                await this.handleError(resp)
            }
        },
        async handleError(response) {
            try {
                const error_data = await response.json()
                this.errors = error_data?.reduce((acc, item) => {
                    const [errLoc, ...rest] = item.loc
                    item.loc = rest
                    if (acc[errLoc]) {
                        acc[errLoc].push(item)
                    } else {
                        acc[errLoc] = [item]
                    }
                    return acc
                }, {})

            } catch (e) {
                alertCreateTest.add(e, 'danger-overlay', true, 5000)
            }
        },
        initial_state() {
            return {
                id: null,
                test_uid: null,

                name: '',
                test_type: '',
                env_type: '',
                loops: 1,
                aggregation: 'max',

                location: 'default',
                parallel_runners: 1,
                cpu_quota: 1,
                memory_quota: 4,
                cloud_settings: {},

                entrypoint: '',
                runner: this.default_runner,
                env_vars: {},
                // customization: {},
                cc_env_vars: {},
                custom_cmd: '',

                errors: {},

                // advanced_params_icon: 'fas fa-chevron-down',
                mode: 'create',
                active_source_tab: undefined,
            }
        },
        set(data) {
            const {test_parameters, integrations, schedules, source, env_vars: all_env_vars, ...rest} = data

            const {cpu_quota, memory_quota, cloud_settings, custom_cmd, ...env_vars} = all_env_vars

            let test_type = ''
            let env_type = ''
            const test_parameters_filtered = test_parameters.filter(item => {
                if (item.name === 'test_type') {
                    test_type = item.default;
                    return false
                }
                if (item.name === 'env_type') {
                    env_type = item.default;
                    return false
                }
                if (item.name === 'test_name') {
                    return false
                }
                return true
            })
            // common fields
            Object.assign(this.$data, {...rest, cpu_quota, memory_quota, cloud_settings, 
                env_vars, test_type, env_type, custom_cmd
            })

            // special fields
            this.test_parameters.set(test_parameters_filtered)
            this.source.set(source)

            integrations && this.integrations.set(integrations)
            schedules && this.schedules.set(schedules)

            // rest?.customization && $(this.$refs.advanced_params).collapse('show')

            this.show()
        },
        clear() {
            Object.assign(this.$data, this.initial_state())
            this.test_parameters.clear()
            this.source.clear()
            this.integrations?.clear()
            this.schedules?.clear()
        },
        clearErrors() {
            this.errors = {}
        },
        show() {
            $(this.$el).modal('show')
        },
        hide() {
            $(this.$el).modal('hide')
            // this.clear() // - happens on close event
        },
    }
}
register_component('UiTestCreateModal', UiTestCreateModal)


const UiTestRunModal = {
    delimiters: ['[[', ']]'],
    props: ['test_params_id', 'instance_name_prefix'],
    template: `
        <div class="modal modal-base fixed-left fade shadow-sm" tabindex="-1" role="dialog" id="runTestModal">
            <div class="modal-dialog modal-dialog-aside" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="row w-100">
                            <div class="col">
                                <h2>Run UI Test</h2>
                            </div>
                            <div class="col-xs">
                                <button type="button" class="btn btn-secondary mr-2" data-dismiss="modal" aria-label="Close">
                                    Cancel
                                </button>
                                <button type="button" class="btn btn-basic" 
                                    @click="handleRun"
                                >
                                    Run test
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-body">
                        <slot name="test_parameters"></slot>
        
                        <div class="row">
                            <div class="form-group col-6 d-flex flex-column justify-content-end pr-2.25">
                                <p class="font-h5 font-semibold">Number of loops</p>
                                <p class="font-h6 font-weight-400">How many times to repeat scenario execution.</p>
                                <div class="custom-input mt-2"
                                    :class="{ 'invalid-input': errors?.loops }"
                                >
                                    <input type="number" class="form-control-alternative"
                                        placeholder="# of loops" 
                                        v-model="loops"
                                        :class="{ 'is-invalid': errors?.loops }"
                                    >
                                    <div class="invalid-feedback">[[ get_error_msg('loops') ]]</div>
                                </div>
                            </div>
                                
                            <div class="form-group col-6 d-flex flex-column justify-content-end pl-2.25">
                                <p class="font-h5 font-semibold">Aggregation</p>
                                <p class="font-h6 font-weight-400">Aggregation rule</p>
                                <div class="custom-input w-100-imp select-validation mt-2"
                                    :class="{ 'is-invalid': errors?.aggregation, 'invalid-select': errors?.aggregation }"
                                >
                                    <select class="selectpicker bootstrap-select__b mt-1" data-style="btn" 
                                        v-model="aggregation"
                                    >
                                        <option value="max">Max</option>
                                        <option value="min">Min</option>
                                        <option value="avg">Avg</option>
                                    </select>
                                </div>
                                <div class="invalid-feedback select_error-msg">[[ get_error_msg('aggregation') ]]</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <p class="font-h5 font-semibold">Timeout</p>
                            <p class="font-h6 font-weight-400">Timeout for test run in seconds, default is 5 hours (18000)</p>
                            <div class="custom-input mb-3 mt-2 mr-3">
                                <input type="text"
                                    placeholder="Timeout, sec"
                                    v-model='timeout'
                                >
                            </div>
                        </div>
                        <div class="form-group">
                            <p class="font-h5 font-semibold">Custom CMD</p>
                            <p class="font-h6 font-weight-400">You may also add a command for test runner</p>
                            <div class="custom-input mb-3 mt-2 mr-3"
                                :class="{ 'invalid-input': errors?.custom_cmd }">
                                <input type="text"
                                    placeholder="Custom CMD"
                                    v-model='custom_cmd'
                                >
                            </div>
                        </div>

                        <UILocations 
                            v-model:location="location"
                            v-model:parallel_runners="parallel_runners"
                            v-model:cpu="cpu_quota"
                            v-model:memory="memory_quota"
                            v-model:cloud_settings="cloud_settings"
                                  
                            ref="locations"
                        ></UILocations>
                        <slot name="integrations"></slot>
                    </div>
                </div>
            </div>
        </div>
    `,
    computed: {
        test_parameters() {
            return ParamsTable.Manager(this.$props.test_params_id)
        },
        integrations() {
            try {
                return IntegrationSection.Manager(this.$props.instance_name_prefix)
            } catch (e) {
                console.warn('No integration section')
                return undefined
            }
        },
    },
    mounted() {
        $(this.$el).on('hide.bs.modal', this.clear)
        $(this.$el).on('show.bs.modal', this.$refs.locations.fetch_locations)
    },
    data() {
        return this.initial_state()
    },
    methods: {
        initial_state() {
            return {
                id: null,
                test_uid: null,

                loops: 1,
                aggregation: 'max',

                location: 'default',
                parallel_runners: 1,
                cpu_quota: 1,
                memory_quota: 4,
                cloud_settings: {},

                env_vars: {},
                // customization: {},
                cc_env_vars: {},
                custom_cmd: '',

                errors: {},
            }
        },
        get_error_msg(field_name) {
            return this.errors[field_name]?.reduce((acc, item) => {
                return acc === '' ? item.msg : [acc, item.msg].join('; ')
            }, '')
        },
        set(data) {
            console.log('set data called', data)
            const {test_parameters, env_vars: all_env_vars, integrations, ...rest} = data

            const {cpu_quota, cloud_settings, memory_quota, custom_cmd, ...env_vars} = all_env_vars

            // common fields
            Object.assign(this.$data, {...rest, cpu_quota, cloud_settings, memory_quota, custom_cmd, env_vars,})

            // special fields
            this.test_parameters.set(test_parameters)
            this.integrations.set(integrations)
            this.show()
        },
        show() {
            $(this.$el).modal('show')
        },
        hide() {
            $(this.$el).modal('hide')
            // this.clear() // - happens on close event
        },
        clear() {
            Object.assign(this.$data, this.initial_state())
            this.test_parameters.clear()
            this.integrations.clear()
        },
        clearErrors() {
            this.errors = {}
        },
        get_data() {
            const test_params = this.test_parameters.get()
            const integrations = this.integrations.get()
            const name = test_params.find(i => i.name === 'test_name')
            const test_type = test_params.find(i => i.name === 'test_type')
            const env_type = test_params.find(i => i.name === 'env_type')

            return {
                common_params: {
                    name: name,
                    test_type: test_type,
                    env_type: env_type,
                    env_vars: {
                        cpu_quota: this.cpu_quota,
                        memory_quota: this.memory_quota,
                        cloud_settings: this.cloud_settings,
                        ENV: env_type["default"],
                        custom_cmd: this.custom_cmd
                    },
                    // parallel_runners: this.parallel_runners,
                    parallel_runners: 1,
                    location: this.location
                },
                test_parameters: test_params,
                timeout: this.timeout,
                integrations: integrations,
                loops: this.loops,
                aggregation: this.aggregation
            }
        },
        async handleRun() {
            this.clearErrors()
            const resp = await fetch(`${ui_api_base_url}/test/${getSelectedProjectId()}/${this.id}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(this.get_data())
            })
            if (resp.ok) {
                this.hide()
                // vueVm.registered_components.table_tests?.table_action('refresh')
                vueVm.registered_components.table_results?.table_action('refresh')
                vueVm.registered_components.table_reports_overview?.table_action('refresh')
            } else {
                await this.handleError(resp)
            }
        },
        async handleError(response) {
            try {
                const error_data = await response.json()
                if (error_data !== null && 'error_type' in error_data && error_data.error_type === "limits") {
                    showNotify('ERROR', error_data.message);
                } else {
                    this.errors = error_data?.reduce((acc, item) => {
                        const [errLoc, ...rest] = item.loc
                        item.loc = rest
                        if (acc[errLoc]) {
                            acc[errLoc].push(item)
                        } else {
                            acc[errLoc] = [item]
                        }
                        return acc
                    }, {})
                }
            } catch (e) {
                alertCreateTest.add(e, 'danger-overlay', true, 5000)
            }
        },
    },
    watch: {
        errors(newValue,) {
            if (Object.keys(newValue).length > 0) {
                newValue.test_parameters ?
                    this.test_parameters.setError(newValue.test_parameters) :
                    this.test_parameters.clearErrors()
                newValue.integrations ?
                    this.integrations?.setError(newValue.integrations) :
                    this.integrations?.clearErrors()
            } else {
                this.test_parameters.clearErrors()
                this.integrations.clearErrors()
            }
        }
    },
}
register_component('UiTestRunModal', UiTestRunModal)

const ui_test_delete = ids => {
    const url = `${ui_api_base_url}/tests/${getSelectedProjectId()}?` + $.param({"id[]": ids})
    fetch(url, {
        method: 'DELETE'
    }).then(response => {
        if (response.ok) {
            vueVm.registered_components.table_tests?.table_action('refresh')
            vueVm.registered_components.table_tests_overview?.table_action('refresh')
        }
    })
}

const ui_results_delete = ids => {
    const url = `${ui_api_base_url}/reports/${getSelectedProjectId()}?` + $.param({"id[]": ids})
    fetch(url, {
        method: 'DELETE'
    }).then(response => response.ok && vueVm.registered_components.table_results?.table_action('refresh'))
}

$(document).on('vue_init', () => {
    $('#delete_tests').on('click', e => {
        const ids_to_delete = vueVm.registered_components.table_tests?.table_action('getSelections').map(
            item => item.id
        ).join(',')
        ids_to_delete && ui_test_delete(ids_to_delete)
    })
    $('#delete_results').on('click', e => {
        const ids_to_delete = vueVm.registered_components.table_results?.table_action('getSelections').map(
            item => item.id
        ).join(',')
        ids_to_delete && ui_results_delete(ids_to_delete)
    })
    socket.on("ui_test_status_updated", data => {
        $('#results_table').bootstrapTable('updateByUniqueId', {
            id: data['report_id'],
            row: {
                'test_status': data['status']
            }
        })
    })
    socket.on("ui_test_finished", data => {
        $('#results_table').bootstrapTable('updateByUniqueId', {
            id: data['id'],
            row: {
                'start_time': data['start_time'],
                'duration': data['duration'],
                'test_status': data['test_status']
            }
        })
    })
})
