const UiResultInfo = {
    props: ['test_data', 'loops'],
    components: {
        'uiperformancetestprogress': UIPerformanceTestProgress,
    },
    data() {
        return {
            result_test_id: new URLSearchParams(location.search).get('result_id'),
        }
    },
    computed: {
        isTestFailed() {
            return !['finished', 'error', 'failed', 'success']
                .includes(this.test_data['test_status']['status'].toLowerCase())
        }
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
                        <button class="btn btn-secondary" id="set_baseline"
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
                                            <td class="font-h5" id="start_time">{{ test_data["start_time"] }}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-gray-500 font-h6 font-semibold">ENDED</td>
                                            <td class="font-h5"  id="end_time font-h5">{{ test_data["end_time"] }}</td>
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
    `
}