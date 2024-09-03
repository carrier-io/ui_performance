const UiResultInfo = {
    props: ['test_data', 'loops'],
    components: {
        'uiperformancetestprogress': UIPerformanceTestProgress,
    },
    data() {
        return {
            result_test_id: new URLSearchParams(location.search).get('result_id'),
            tasksList: [],
            selectedTask: null,
            isLoadingRun: false,
        }
    },
    watch: {
        selectedTask(newVal, oldVal) {
            this.fetchParameters().then(data => {
                if (data.rows) {
                    $("#RunTaskModal_test_params").bootstrapTable('append', data.rows[0].task_parameters);
                } else {
                    $("#RunTaskModal_test_params").bootstrapTable('load', []).bootstrapTable('append', [{
                        "name": "report_id",
                        "default": this.result_test_id,
                        "description": "",
                        "type": "",
                        "action": "",
                    }]);
                }
            });
        }
    },
    computed: {
        isTestFailed() {
            return !['finished', 'error', 'failed', 'success', 'cancelled']
                .includes(this.test_data['test_status']['status'].toLowerCase())
        },
    },
    mounted() {
        ApiFetchTasks().then(data => {
            this.tasksList = data.rows;
        });
        $('#RunTaskModal').on('show.bs.modal', () => {
            this.$nextTick(() => {
                $("#RunTaskModal_test_params").bootstrapTable('append', [{
                    "name": "report_id",
                    "default": this.result_test_id,
                    "description": "",
                    "type": "",
                    "action": "",
                }]);
                $('#selectResult').selectpicker('refresh');
            })
        })
        $('#RunTaskModal').on('hide.bs.modal', () => {
            this.resetParams();
        })
    },
    methods: {
        reRunTest () {
            fetch(`/api/v1/ui_performance/rerun/${this.result_test_id}`, {
                method: 'POST'
            }).then(response => {
                if (response.ok) {
                    response.json().then(({result_id}) => {
                        alertMain.add(
                            `Test rerun successful! Check out the <a href="?result_id=${result_id}">result page</a>`,
                            'success-overlay',
                            true
                        )
                    })
                } else {
                    response.text().then(data => {
                        alertMain.add(data, 'danger')
                    })
                }
            })
        },
        format_date(d) {
            const date_obj = new Date(d)
            return isNaN(date_obj) ? '' : date_obj.toLocaleString()
        },
        handleRunTask() {
            this.isLoadingRun = true;
            this.runTask().then(() => {
                $('#RunTaskModal').modal('hide');
                this.resetParams();
            }).finally(() => {
                this.isLoadingRun = false;
            })
        },
        async runTask() {
            const resp = await fetch(`/api/v1/tasks/run_task/default/${getSelectedProjectId()}/${this.selectedTask}`,{
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify($("#RunTaskModal_test_params").bootstrapTable('getData')),
            })
            return resp.json();
        },
        resetParams() {
            this.selectedTask = null;
            $('#selectResult').selectpicker('val', null)
            $("#RunTaskModal_test_params").bootstrapTable('load', []);
        },
        async fetchParameters() {
            const api_url = this.$root.build_api_url('tasks', 'tasks')
            const res = await fetch (`${api_url}/${getSelectedProjectId()}/${this.selectedTask}?get_parameters=true`,{
                method: 'GET',
            })
            return res.json();
        },
    },
    template: `
        <div class="card card-12">
            <div class="p-28 pb-20">
                <div class="d-flex justify-content-between">
                    <div class="d-flex align-items-center">
                        <a id="back-button" class="mr-2" @click="() => window.history.back()">
                            <i class="icon__16x16 icon-arrow-left-bold__16"></i>
                        </a>
                        <p class="font-h3 font-bold">{{ test_data["name"] }} (back) </p>
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-secondary" data-toggle="modal" data-target="#RunTaskModal">
                            Run task
                        </button>
                        <button class="btn btn-secondary ml-2" id="set_baseline"
                                data-toggle="tooltip" data-placement="top" title="Set current report as baseline">
                            Set as baseline
                        </button>
                        <button hidden class="btn btn-secondary ml-2" id="not_worse_than"
                                data-toggle="tooltip" data-placement="top" title="Set current report as thresholds">
                            Set as threshold
                        </button>
                        <button class="btn btn-secondary btn-icon btn-icon__purple ml-2" id="show_config_btn"
                                data-toggle="modal"
                                data-target="#config_modal">
                            <i data-toggle="tooltip" 
                                data-placement="top" 
                                title="Show config for current test run" 
                                class="icon__18x18 icon-settings"></i>
                        </button>
                        <button class="btn btn-secondary btn-icon btn-icon__purple ml-2"
                                @click="reRunTest"
                                data-toggle="tooltip"
                                data-placement="top"
                                title="Rerun Test">
                            <i class="icon__18x18 icon-run"></i>
                        </button>
                        <button type="button" class="btn btn-secondary btn-icon btn-icon__purple ml-2"
                                data-toggle="tooltip" data-placement="top" title="Download report">
                                <i class="icon__18x18 icon-download"></i>
                        </button>
                        <button v-if="isTestFailed" 
                                class="btn btn-painted ml-2"
                                style="--text-color:rgb(243, 38, 38); --brd-color:rgb(242, 180, 180);">
                            Stop test
                        </button>
                    </div>
                </div>
                <div id="progressbar-body">
                    <uiperformancetestprogress
                        v-if="isTestFailed"
                        :test_status="test_data.test_status"
                        :project_id="test_data.project_id"
                        :test_id="test_data.id"
                    ></uiperformancetestprogress>
                </div>
                <div id="ui-small-cards" class="mt-24">
                    <div class="d-grid grid-column-5 gap-3">
                        <div class="card card-sm card-blue">
                            <div class="card-header">{{ test_data["total_pages"] }}</div>
                            <div class="card-body">Total pages</div>
                        </div>
                        <div class="card card-sm card-blue">
                            <div class="card-header">{{ test_data["avg_page_load"] }} sec</div>
                            <div class="card-body">AVG PAGE LOAD</div>
                        </div>
                        <div class="card card-sm card-blue">
                            <div class="card-header">{{ test_data["thresholds_missed"] }} %</div>
                            <div class="card-body">MISSED THRESHOLDS RATE</div>
                        </div>
                        <div class="card card-sm card-blue">
                            <div class="card-header">{{ test_data["loops"] }}</div>
                            <div class="card-body">LOOPS</div>
                        </div>
                        <div class="card card-sm card-blue">
                            <div class="card-header">{{ test_data["aggregation"] }}</div>
                            <div class="card-body">AGGREGATION</div>
                        </div>
                    </div>
                    <div class="row" id="processing-table">
                        <div class="col">
                            <div class="card card-sm-table">
                                <div class="card-body d-flex justify-content-between">
                                    <table>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">Status</td>
                                            <td class="font-h5">{{ test_data['test_status']['status'] }}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">DURATION</td>
                                            <td class="font-h5">{{ test_data["duration"] }}s</td>
                                        </tr>
                                    </table>
                                    <table>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">STARTED</td>
                                            <td class="font-h5" id="start_time">{{ format_date(test_data.start_time) }}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">ENDED</td>
                                            <td class="font-h5" id="end_time font-h5">{{ format_date(test_data.end_time) }}</td>
                                        </tr>
                                    </table>
                                    <table>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">Environment</td>
                                            <td class="font-h5">{{ test_data["environment"] }}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">Test type</td>
                                            <td class="font-h5">{{ test_data["test_type"] }}</td>
                                        </tr>
                                    </table>
                                    <table>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">Browser config</td>
                                            <td class="font-h5">{{ test_data["browser"] }}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">Tags</td>
                                            <td>
                                                <span v-for="tag in test_data['tags']" class="badge badge-primary">{{ tag }}</span>
                                            </td>
                                        </tr>
                                    </table>
                                    <div style="width: 100px"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="my-0">
            <div class="p-28 pt-20">
                <p class="text-gray-500 font-h6 font-semibold float-left pt-1 mr-4">LOOPS</p>
                <ul class="custom-tabs nav nav-pills">
                    <li class="nav-item">
                        <a class="active"
                           data-toggle="pill"
                           href="#"
                           @click="$emit('select-loop', 'all')"
                           aria-selected="true">ALL</a>
                    </li>
                    <li v-for="loop in loops" class="nav-item">
                        <a class=""
                           data-toggle="pill"
                           href="#"
                           @click="$emit('select-loop', loop)"
                           aria-selected="true">{{ loop }}</a>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="modal fixed-left fade shadow-sm" tabindex="-1" role="dialog" id="RunTaskModal">
            <div class="modal-dialog modal-dialog-aside" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="d-flex justify-content-between w-100">
                            <p class="font-h3 font-weight-bold">Tasks</p>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn mr-2 btn-secondary" data-dismiss="modal" aria-label="Close">
                                    Cancel
                                </button>
                                <button type="button" 
                                    class="btn btn-basic d-flex align-items-center"
                                    @click="handleRunTask"
                                    :disabled="selectedTask === null"
                                    >Run<i v-if="isLoadingRun" class="preview-loader__white"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="section">
                            <div v-if="tasksList.length > 0">
                                <p class="font-h5 font-bold">Select task for run:</p>
                                <select id="selectResult"
                                    v-model="selectedTask"
                                    class="selectpicker bootstrap-select__b displacement-ml-4" data-style="btn">
                                    <option v-for="(task, index) in tasksList" :key="index" :value="task.task_id">{{ task.task_name }}</option>
                                </select>
                            </div>
                        </div>
                        <slot></slot>
                    </div>
                </div>
            </div>
        </div>
    `
}