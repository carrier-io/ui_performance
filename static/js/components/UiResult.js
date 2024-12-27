const UiResult = {
    props: ['test_data', 'url'],
    components: {
        'ui-result-info': UiResultInfo,
        'ui-result-charts': UiResultCharts,
        'ui-result-table': UiResultTable,
        'performance-logs-app': PerformanceLogsApp,
    },
    data() {
        return {
            testStatus: null,
            selectedLoop: 'all',
            loops: [],
        }
    },
    computed: {
        isTestFinished() {
            return ['finished', 'error', 'failed', 'success', 'cancelled']
                .includes(this.test_data['test_status']['status'].toLowerCase())
        },
        testInProgress() {
            return !['finished', 'error', 'failed', 'success', 'canceled']
                .includes(this.test_data['test_status']['status'].toLowerCase())
        },
    },
    methods: {
        changeLoop(loop) {
            this.selectedLoop = loop;
        },
        setLoops(loops) {
            this.loops = loops;
        },
    },
    template: `
        <ui-result-info
            :loops="loops"
            @select-loop="changeLoop"
            :test_data="test_data">
            <slot name='test_parameters_run'></slot>
        </ui-result-info>

        <ui-result-charts
            v-if="isTestFinished"
            @set-loops="setLoops"
            :selected-loop="selectedLoop">
        </ui-result-charts>
        <preset-table
            v-if="isTestFinished"
            :query_params="{
                sort: 'loop',
                order: 'asc'
            }"
            filter_name="name"
            :summary_url="url"
            :selected_loop="selectedLoop"
        >
            <template v-slot:table-pills>
                <div class="d-flex justify-content-between">
                    <div class="d-flex justify-content-end align-items-center">
                        <div>
                            <ul class="custom-tabs nav nav-pills mr-3" id="pills-tab" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <a class="active" id="pills-all-tab" data-toggle="pill" href="#pills-all" role="tab" aria-controls="all" aria-selected="true">ALL</a>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <a class="" id="pills-pages-tab" data-toggle="pill" href="#pills-pages" role="tab" aria-controls="pages" aria-selected="false">PAGES</a>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <a class="" id="pills-actions-tab" data-toggle="pill" href="#pills-actions" role="tab" aria-controls="false_positive" aria-selected="false">ACTIONS</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </template>
            <template v-slot:table-header>
                <tr>
                    <th scope="col" data-sortable="true" data-field="name">Page Name</th>
                    <th scope="col" data-sortable="true" data-field="identifier">identifier</th>
                    <th scope="col" data-sortable="true" data-field="type">type</th>
                    <th scope="col" data-sortable="true" data-field="loop">Loop</th>
                    <th scope="col" data-sortable="true" data-field="load_time">Load time</th>
                    <th scope="col" data-sortable="true" data-field="dom">
                        <span data-toggle="tooltip" data-placement="top" title="Dom Content Load">
                            DOM
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="tti">
                        <span data-toggle="tooltip" data-placement="top" title="Time To Interactive">
                            TTI
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="fcp">
                        <span data-toggle="tooltip" data-placement="top" title="First Contentful Paint">
                            FCP
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="lcp">
                        <span data-toggle="tooltip" data-placement="top" title="Largest Contentful Paint">
                            LCP
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="cls">
                        <span data-toggle="tooltip" data-placement="top" title="Cumulative Layout Shift">
                            CLS
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="tbt">
                        <span data-toggle="tooltip" data-placement="top" title="Total Blocking Time">
                            TBT
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="fvc">
                        <span data-toggle="tooltip" data-placement="top" title="First Visual Change">
                            FVC
                        </span>
                    </th>
                    <th scope="col" data-sortable="true" data-field="lvc">
                        <span data-toggle="tooltip" data-placement="top" title="Last Visual Change">
                            LVC
                        </span>
                    </th>
                    <th scope="col" data-formatter=reportLink>Report</th>
                </tr>
            </template>
        </preset-table>
      <div class="mb-3" v-if="testInProgress">
        <performance-logs-app
            @register="register"
            instance_name="perf_logs"
            :project_id="test_data.project_id"
            :build_id="test_data.build_id"
            :report_id="test_data.uid"
        ></performance-logs-app>
      </div>
    `
}

register_component('ui-result', UiResult)