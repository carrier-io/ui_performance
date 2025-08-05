const api_th_base_url = '/api/v1/ui_performance'
const ThresholdModal = {
    props: ['modal_id', 'thresholds_table_component_name', 'tests_table_component_name'],
    delimiters: ['[[', ']]'],
    data() {
        return this.initial_state()
    },
    mounted() {
        $(this.$el).on('hide.bs.modal', this.clear)
        $(this.$el).on('show.bs.modal', () => {
            this.test_options = vueVm.registered_components[
                this.$props.tests_table_component_name
            ]?.table_action('getData').reduce((accum, item) => {
                !this.forced_test_options.includes(item.name) && accum.push(item.name)
                return accum
            }, [])
        })
    },
    template: `
<div class="modal modal-small fixed-left fade shadow-sm" tabindex="-1" role="dialog" 
    :id="modal_id"
>
    <div class="modal-dialog modal-dialog-aside" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <div class="row w-100">
                    <div class="col">
                        <p class="font-h3 font-bold">[[ mode === 'update' ? 'Update' : 'Create' ]] threshold</p>
                    </div>
                    <div class="col-xs">
                        <button type="button" class="btn  btn-secondary mr-2" data-dismiss="modal" aria-label="Close">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-basic"
                            :disabled="is_fetching"
                            @click="() => mode === 'update' ? handle_update_threshold() : handle_create_threshold()"
                        >
                            [[ mode === 'update' ? 'Update' : 'Save' ]]
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-body">
                <div class="section">
                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                            <p class="font-h5 font-semibold mb-1">Test</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                v-model="test"
                                @change="handle_change_test"
                                :disabled="mode !== 'create'"
                            >
                                <option v-for="test in forced_test_options" :value="test">[[ test ]]</option>
                                <option v-for="test in test_options" :value="test">[[ test ]]</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.test ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                            <p class="font-h5 font-semibold mb-1">Test Environment</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                :disabled="!test"
                                v-model="environment"
                                @change="handle_change_env"
                            >
                                <option v-for="item in forced_env_options" :value="item">[[ item ]]</option>
                                <option v-for="item in env_options" :value="item">[[ item ]]</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.environment ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                            <p class="font-h5 font-semibold">Scope</p>
                            <p class="font-h6 font-weight-400 mb-2">Request(s) you want thresholds to be applied to.</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                :disabled="!environment"
                                v-model="scope"
                            >
                                <option value="all">All</option>
                                <option value="every">Every</option>
                                <option v-for="sc in forced_scope_options" :value="sc">[[ sc ]]</option>
                                <option v-for="sc in scope_options" :value="sc.identifier">[[ sc.name ]]</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.scope ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                        <p class="font-h5 font-semibold">Target</p>
                        <p class="font-h6 font-weight-400 mb-2">Metric you want to be measured against.</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                v-model="target"
                            >
                                <option value="load_time">Load Time</option>
                                <option value="dom_processing">Dom Processing</option>
                                <option value="time_to_interactive">Time To Interactive</option>
                                <option value="first_contentful_paint">First Contentful Paint</option>
                                <option value="largest_contentful_paint">Largest Contentful Paint</option>
                                <option value="cumulative_layout_shift">Cumulative Layout Shift</option>
                                <option value="total_blocking_time">Total Blocking Time</option>
                                <option value="first_visual_change">First Visual Change</option>
                                <option value="last_visual_change">Last Visual Change</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.target ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                        <p class="font-h5 font-semibold">Aggregation</p>
                        <p class="font-h6 font-weight-400 mb-2">Math aggregation of the metrics to be applied for threshold calculation.</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                v-model="aggregation"
                            >
                                <option value="max">Maximum</option>
                                <option value="min">Minimum</option>
                                <option value="avg">Average</option>
                                <option value="pct95">Percentile 95</option>
                                <option value="pct50">Percentile 50</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.aggregation ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100 mb-3">
                        <p class="font-h5 font-semibold">Comparison</p>
                        <p class="font-h6 font-weight-400 mb-2">Rule to be used to compare results with thresholds.</p>
                            <select class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn"
                                v-model="comparison"
                            >
                                <option value="gte">&gt;=</option>
                                <option value="lte">&lt;=</option>
                                <option value="lt">&lt;</option>
                                <option value="gt">&gt;</option>
                                <option value="eq">==</option>
                            </select>
                            <div class="invalid-feedback" style="display: block;">[[ errors.comparison ]]</div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="d-flex flex-column w-100">
                            <p class="font-h5 font-semibold mb-1">Threshold value</p>
                            <input type="number" class="form-control form-control-alternative"
                                v-model="value"
                            >
                            <div class="invalid-feedback" style="display: block;">[[ errors.value ]]</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    
    `,
    watch: {
        test_options() {
            this.$nextTick(this.update_pickers)
        },
        forced_test_options() {
            this.$nextTick(this.update_pickers)
        },
        env_options() {
            this.$nextTick(this.update_pickers)
        },
        forced_env_options() {
            this.$nextTick(this.update_pickers)
        },
        scope_options() {
            this.$nextTick(this.update_pickers)
        },
        forced_scope_options() {
            this.$nextTick(this.update_pickers)
        }
    },
    methods: {
        initial_state() {
            return {
                test: undefined,
                environment: undefined,
                scope: undefined,
                target: 'throughput',
                aggregation: 'max',
                comparison: 'gte',
                value: null,

                forced_test_options: [],
                test_options: [],
                forced_env_options: [],
                env_options: [],
                scope_options: [],
                forced_scope_options: [],
                id: null,
                mode: 'create',
                errors: {},
                is_fetching: false
            }
        },
        update_pickers() {
            $(this.$el).find('.selectpicker').selectpicker('redner').selectpicker('refresh')
        },
        async handle_change_test() {
            this.environment = undefined
            this.forced_test_options = []
            this.forced_env_options = []
            await this.handle_fetch_env()
        },
        async handle_fetch_env() {
            const resp = await fetch(`${api_th_base_url}/environments/${getSelectedProjectId()}?` +
                $.param({name: this.test})
            )
            if (resp.ok) {
                this.env_options = (await resp.json()).filter(i => !this.forced_env_options.includes(i))
            } else {
                showNotify('ERROR', 'Error updating environments')
            }
        },
        async handle_change_env() {
            if (!this.env_options.includes(this.environment)) {
                this.environment = undefined
            }
            this.forced_env_options = []
            this.forced_scope_options = []
            await this.handle_fetch_scope()
        },
        async handle_fetch_scope() {
            const resp = await fetch(`${api_th_base_url}/scopes/${getSelectedProjectId()}?` +
                $.param({name: this.test, environment: this.environment})
            )
            if (resp.ok) {
                this.scope_options = (await resp.json()).filter(i => !this.forced_scope_options.includes(i))
            } else {
                showNotify('ERROR', 'Error updating scopes')
            }
        },
        async handle_create_threshold() {
            this.errors = {}
            const {test, environment, scope, target, aggregation, comparison, value} = this
            this.is_fetching = true
            const resp = await fetch(`${api_th_base_url}/thresholds/${getSelectedProjectId()}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({test, environment, scope, target, aggregation, comparison, value}),
            })
            if (resp.ok) {
                vueVm.registered_components[this.$props.thresholds_table_component_name]?.table_action('refresh')
                $(this.$el).modal('hide')
            } else {
                showNotify('ERROR', 'Error creating threshold')
                this.setError(await resp.json())
            }
            this.is_fetching = false
        },
        async handle_update_threshold() {
            this.errors = {}
            const {test, environment, scope, target, aggregation, comparison, value, id} = this
            this.is_fetching = true
            const resp = await fetch(`${api_th_base_url}/thresholds/${getSelectedProjectId()}/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({test, environment, scope, target, aggregation, comparison, value, id}),
            })
            if (resp.ok) {
                vueVm.registered_components[this.$props.thresholds_table_component_name]?.table_action('refresh')
                $(this.$el).modal('hide')
            } else {
                showNotify('ERROR', 'Error updating threshold')
                this.setError(await resp.json())
            }
            this.is_fetching = false
        },
        set(data, show = true) {
            this.clear()
            this.mode = 'update'
            const {aggregation, comparison, environment, scope, target, test, value, id} = data
            Object.assign(this.$data, {aggregation, comparison, environment, scope, target, test, value, id})
            this.forced_test_options.push(test)

            this.forced_env_options.push(environment)

            !['all', 'every'].includes(scope) && this.forced_scope_options.push(scope)

            show && $(this.$el).modal('show')
            this.handle_fetch_env()
            this.handle_fetch_scope()

        },
        clear() {
            Object.assign(this.$data, this.initial_state())
        },
        setError(errors) {
            errors.forEach(i => {
                this.errors[i.loc[0]] = i.msg
            })
        }
    }

}

register_component('ThresholdModal', ThresholdModal)


const threshold_delete = ids => {
    const url = `${api_th_base_url}/thresholds/${getSelectedProjectId()}?` + $.param({"id[]": ids})
    fetch(url, {
        method: 'DELETE'
    }).then(response => response.ok && vueVm.registered_components.table_thresholds?.table_action('refresh'))
}


var threshold_formatters = {
    test_env(value, row) {
        return `
            <div>
                <p class="font-h5 mb-0 text-gray-800">${row.test}</p>
                <span class="font-weight-400 text-gray-600 font-h6">${row.environment}</span>
            </div>
        `
    },
    actions(value, row, index) {
        return `
        <div class="d-flex justify-content-end">
            <button type="button" class="btn btn-default btn-xs btn-table btn-icon__xs action_edit">
                <i class="icon__18x18 icon-settings"></i>
            </button>
            <button type="button" class="btn btn-default btn-xs btn-table btn-icon__xs action_delete ml-2">
                <i class="icon__18x18 icon-delete"></i>
            </button>
        </div>
        `
    },
    rules(value, row, index) {
        const comparison = new Map([
            ["gte", ">="],
            ["lte", "<="],
            ["lt", "<"],
            ["gt", ">"],
            ["eq", "=="]
        ]).get(row.comparison)
        return `
            <div>
                <p class="font-h5 mb-0 text-gray-800">${row.aggregation} ${comparison} ${row.value}</p>
                <span class="font-weight-400 text-gray-600 font-h6">${row.target}</span>
            </div>
        `
    },
    scopes(value, row, index) {
        return value.split("@")[1] || value
    },
    action_events: {
        'click .action_edit': function (e, value, row, index) {
            const component_proxy = vueVm.registered_components.threshold_modal
            component_proxy.set(row)
        },
        'click .action_delete': function (e, value, row, index) {
            const modal = vueVm.registered_components.confirm_delete_ui_threshold;
            modal.show([row.id], [row.test]);
        }
    }
}

$(() => {
    $('#delete_thresholds').on('click', () => {
        const table_proxy = vueVm.registered_components.table_thresholds;
        const selected = table_proxy?.table_action('getSelections');
        if (!selected || selected.length === 0) return;
        const ids = selected.map(i => i.id);
        const names = selected.map(i => i.test);
        vueVm.registered_components.confirm_delete_ui_threshold.show(ids, names);
    });
})