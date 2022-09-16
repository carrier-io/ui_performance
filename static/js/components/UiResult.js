const UiResult = {
    components: {
        'ui-result-line-chart': UiResultLineChart,
        'ui-result-bar-chart': UiResultBarChart,
    },
    data() {
        return {
            metric: valuesName[0],
            activeTab: 'line'
        }
    },
    props: ['instance_name'],
    mounted() {
        const vm = this;
        $('#metric').on("changed.bs.select", function() {
            vm.metric = this.value;
        });
    },
    methods: {

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
            <div class="position-relative">
                <ui-result-line-chart
                    v-if="activeTab === 'line'"
                    :metric="metric">
                </ui-result-line-chart>
                <ui-result-bar-chart
                    v-else
                    :metric="metric">
                </ui-result-bar-chart>
            </div>
        </div>
    `
}

register_component('ui-result-charts', UiResult);