const UiResultLineChart = {
    props: ['metric', 'lineChartData'],
    data() {
        lineChart: null
        return {
            initialData: null,
            legendList: [],
            selectedLegend: [],
            loading: false,
            pagesCount: 0,
            isShowDottedLine: true,
        }
    },
    mounted() {
        this.generateDatasets(this.metric);
    },
    watch: {
        metric(newValue, oldValue) {
            this.lineChart.destroy();
            this.lineChart = null;
            this.generateDatasets(newValue, true)
        }
    },
    computed: {
        isAllSelected() {
            return (this.selectedLegend.length < this.legendList.length) && this.selectedLegend.length > 0
        },
        isAllSelectCbxFilled() {
            return this.selectedLegend.length === this.legendList.length
        }
    },
    methods: {
        generateDottedDatasets() {
            const countIndex = this.lineChartData[0].labels.length;
            const dottedData = [];

            for (let i = 0; i < countIndex; i++) {
                const data = [];
                this.lineChartData.forEach((page) => {
                    if (!this.selectedLegend.includes(page.name)) return
                    data.push({
                        y: page.datasets[this.metric][i],
                        x: page.labels[i]
                    })
                })
                data.sort((a, b) => {
                    return new Date(b.x) - new Date(a.x);
                })
                dottedData.push({
                    borderDash: [10,5],
                    borderColor: '#727272',
                    data,
                    label: `loop ${i}`
                })
            }
            return dottedData;
        },
        generateDatasets(metric, isUpdate = false) {
            if (isUpdate) {
                this.selectedLegend = [];
                this.$refs['legendCbx'].forEach(cbx => {
                    cbx.checked = true;
                })
                this.$refs['dottedLegendCbx'].checked = true
                this.pagesCount = 0;
            }

            const datasets = this.lineChartData.map((page, index) => {
                this.pagesCount++;
                this.selectedLegend.push(page.name)
                const ds = {
                    backgroundColor: barColors[index],
                    borderColor: barColors[index],
                    label: page.name,
                };
                const data = page.datasets[metric].map((value, i) => {
                    return {
                        y: value,
                        x: page.labels[i],
                    }
                });
                return {
                    ...ds,
                    data,
                }
            })
            const mixedDatasets = [...datasets, ...this.generateDottedDatasets()];
            this.drawCanvas(mixedDatasets);
        },
        drawCanvas(datasets) {
            const ctx = document.getElementById("linechart");
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets,
                },
                options: {
                    plugins: {
                        legend: {
                            display: false,
                        }
                    },
                    scales: {
                        x: {
                            offset: false,
                            type: 'time',
                            grid: {
                                offset: false
                            },
                            ticks: {
                                maxTicksLimit: 10,
                            },
                        }
                    }
                }
            });
            this.lineChart = chart
            this.legendList = chart.options.plugins.legend.labels.generateLabels(chart).slice(0, this.pagesCount);
        },
        combineDatasets() {
            this.lineChart.data.datasets = [...this.lineChart.data.datasets.slice(0, this.pagesCount),
                ...this.generateDottedDatasets()];
            this.lineChart.data.datasets.forEach((ds, i) => {
                if (i >= this.pagesCount) {
                    this.lineChart.getDatasetMeta(i).hidden = !this.isShowDottedLine;
                }
            })
        },
        selectDottedLegend({ target: { checked }}) {
            let hidden = checked;
            this.isShowDottedLine = checked;
            this.lineChart.data.datasets.forEach((ds, i) => {
                if (i >= this.pagesCount) {
                    this.lineChart.getDatasetMeta(i).hidden = !hidden;
                }
            })
            this.lineChart.update();
        },
        selectLegend(legend) {
            let hidden = !this.lineChart.getDatasetMeta(legend.datasetIndex).hidden;
            this.selectedLegend = hidden
                ? this.selectedLegend.filter(lg => lg !== legend.text)
                : [...this.selectedLegend, legend.text];
            this.lineChart.data.datasets.forEach((ds, i) => {
                if (this.lineChart.getDatasetMeta(legend.datasetIndex).label === ds.label) {
                    this.lineChart.getDatasetMeta(i).hidden = hidden;
                }
            })
            this.combineDatasets();
            this.lineChart.update()
        },
        selectAll({ target }) {
            const hidden = !target.checked;

            this.selectedLegend = hidden
                ? []
                : this.legendList.map(lg => lg.text)

            this.lineChart.data.datasets.forEach((ds, i) => {
                this.lineChart.getDatasetMeta(i).hidden = hidden;
                this.$refs['legendCbx'].forEach(cbx => {
                    cbx.checked = !hidden;
                })
            })
            if (!hidden) {
                this.combineDatasets();
            }

            this.lineChart.update()
        }
    },
    template: `
        <div class="d-flex mt-3">
            <div class="chart flex-grow-1" style="position: relative">
                <div 
                    v-if="loading"
                    class="layout-spinner">
                    <i class="spinner-loader__32x32 spinner-centered"></i>
                </div>
                <canvas id="linechart"></canvas>
            </div>
            <div class="card" style="width:280px; height: 500px; margin-left: 28px">
                <div class="d-flex flex-column p-3">
                    <label
                        class="mb-0 w-100 d-flex align-items-center custom-checkbox custom-checkbox__multicolor"
                        :class="{ 'custom-checkbox__minus': isAllSelected }"
                        for="all_checkbox">
                        <input
                            class="mx-2 custom__checkbox"
                            :checked="isAllSelectCbxFilled" id="all_checkbox"
                            style="--cbx-color: var(--basic);"
                            @change="selectAll"
                            type="checkbox">
                        <span class="w-100 d-inline-block">Select/Unselect all</span>
                    </label>
                </div>
                <hr class="my-0">
                <div id="linechart-group-legend"
                     class="custom-chart-legend d-flex flex-column px-3 py-3"
                     style="height: 400px; overflow: scroll;"
                >
                    <div v-for="(legend, index) in legendList" class="d-flex mb-3 float-left mr-3">
                        <label
                            class="mb-0 w-100 d-flex align-items-center custom-checkbox custom-checkbox__multicolor">
                            <input
                                class="mx-2 custom__checkbox"
                                checked="true"
                                ref="legendCbx"
                                @change="selectLegend(legend)"
                                :style="{'--cbx-color': legend.fillStyle}"
                                type="checkbox">
                            <span class="w-100 d-inline-block">{{ legend.text }}</span>
                        </label>
                    </div>
                </div>
                <hr class="my-0">
                <div id="linechart-group-legend"
                     class="custom-chart-legend d-flex flex-column px-3 py-3"
                >
                    <div class="d-flex float-left mr-3">
                        <label
                            class="mb-0 w-100 d-flex align-items-center custom-checkbox custom-checkbox__multicolor">
                            <input
                                class="mx-2 custom__checkbox"
                                checked="true"
                                ref="dottedLegendCbx"
                                @change="selectDottedLegend($event)"
                                :style="{'--cbx-color': '#dadada'}"
                                type="checkbox">
                            <span class="w-100 d-inline-block">Show dotted Line</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `
}