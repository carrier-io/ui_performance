const UiResultCharts = {
    components: {
        'ui-result-line-chart': UiResultLineChart,
        'ui-result-bar-chart': UiResultBarChart,
    },
    data() {
        return {
            metric: valuesName[0],
            activeTab: 'line',
            lineChartData: null,
            barChartData: null,
            loopedBarChartData: null,
            loading: true,
        }
    },
    props: ['selectedLoop'],
    mounted() {
        this.loading = true;
        const vm = this;
        $('#metric').on("changed.bs.select", function() {
            vm.metric = this.value;
        });
        Promise.all([this.fetchLineChartData(), this.fetchBarChartData()])
            .then(res => {
                this.lineChartData = res[0];
                this.loopedBarChartData = res[1];
                this.loading = false;
            }).catch(err => {
            console.log(err)
        })
    },
    computed: {
        resultTestId() {
            return new URLSearchParams(location.search).get('result_id')
        }
    },
    methods: {
        async fetchLineChartData() {
            const res = await fetch(`/api/v1/ui_performance/linechart/${getSelectedProjectId()}/${this.resultTestId}`, {
                method: 'GET',
            })
            const lineChartData = await res.json();
            return lineChartData;

        },
        async fetchBarChartData () {
            const res = await fetch(`/api/v1/ui_performance/barchart/${getSelectedProjectId()}/${this.resultTestId}`, {
                method: 'GET',
            })
            this.barChartData = await res.json();
            const loopedBarChartData = [...this.barChartData];
            if (this.barChartData.length > 0 ) {
                const loops = Object.keys(this.barChartData[0].loops);
                this.$emit('set-loops', loops);
            }
            return loopedBarChartData;
        }

    },
    watch: {
        selectedLoop() {
            this.loopedBarChartData = this.barChartData.map(page => {
                const loops = this.selectedLoop === 'all' ? page.loops :
                    { [this.selectedLoop] : page.loops[this.selectedLoop] }
                return {
                    ...page,
                    loops
                }
            })
        }
    },
    template: `
        <div class="card card-12 p-28 mt-3">
            <div class="card-header d-flex justify-content-between">
                <div class="d-flex justify-content-between align-items-center">
                    <p class="font-h3 font-bold text-gray mr-4">Summary</p>
                    <span>Aggr.: max (in sec.)</span>
                </div>
                <div class="d-flex align-items-center">
                    <div class="selectpicker-titled mr-3">
                        <span class="font-h6 font-semibold px-3 item__left">METRIC</span>
                        <select class="selectpicker" data-style="item__right" id="metric">
                            <option value="load_time">Load time</option>
                            <option value="dom">DOM Content Loading</option>
                            <option value="tti">Time To Interactive</option>
                            <option value="fcp">First Contentful Paint</option>
                            <option value="lcp">Largest Contentful Paint</option>
                            <option value="cls">Cumulative Layout Shift</option>
                            <option value="tbt">Total Blocking Time</option>
                            <option value="fvc">First Visual Change</option>
                            <option value="lvc">Last Visual Change</option>
                        </select>
                    </div>
                    <ul class="custom-tabs nav nav-pills" id="icons-tab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <a class="active" 
                                @click="activeTab = 'line'"
                                id="pills-home-tab"
                                data-toggle="pill"
                                href="#pills-home"
                                role="tab"
                                aria-controls="pills-home"
                                aria-selected="true">LINE</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="" 
                                @click="activeTab = 'bar'"
                                id="pills-profile-tab" 
                                data-toggle="pill" 
                                href="#pills-profile"
                                role="tab" 
                                aria-controls="pills-profile"
                                aria-selected="false">BARCHART</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="position-relative" style="min-height: 200px">
                <div 
                    v-if="loading"
                    class="layout-spinner">
                    <i class="spinner-loader__32x32 spinner-centered"></i>
                </div>
                <div v-else>
                    <ui-result-line-chart
                        v-if="activeTab === 'line'"
                        :loading="loading"
                        :key="selectedLoop"
                        :selectedLoop="selectedLoop"
                        :line-chart-data="lineChartData"
                        :metric="metric">
                    </ui-result-line-chart>
                    <ui-result-bar-chart
                        v-else
                        :bar-chart-data="loopedBarChartData"
                        :key="loopedBarChartData"
                        :metric="metric">
                    </ui-result-bar-chart>
                </div>
            </div>
        </div>
    `
}