const UiResult = {
    props: ['test_data', 'url'],
    components: {
        'ui-result-info': UiResultInfo,
        'ui-result-charts': UiResultCharts,
        'ui-result-table': UiResultTable,
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
            return ['finished', 'error', 'failed', 'success']
                .includes(this.test_data['test_status']['status'].toLowerCase())
        },
    },
    methods: {
        changeLoop(loop) {
            this.selectedLoop = loop;
        },
        setLoops(loops) {
            this.loops = loops;
        }
    },
    template: `
        <ui-result-info
            :loops="loops"
            @select-loop="changeLoop"
            :test_data="test_data">
        </ui-result-info>
        
        <ui-result-charts
            v-if="isTestFinished"
            @set-loops="setLoops"
            :selected-loop="selectedLoop">
        </ui-result-charts>
        
        <ui-result-table
            v-if="isTestFinished"
            :url="url">
        </ui-result-table>
    `
}

register_component('ui-result', UiResult)