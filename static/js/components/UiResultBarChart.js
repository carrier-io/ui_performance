const UiResultBarChart = {
    props: ['metric', 'barChartData'],
    data() {
        lineChart: null
        return {
            initialData: null,
            legendList: [],
            selectedLegend: [],
            countStacks: null,
            labels: [],
            selectedLabels: {},
            normalizedData: null,
            lineLabel: 'load_time',
            loading: false,
            chartOptions: {
                type: 'line',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    htmlLegend: {
                        containerID: 'legend-container',
                    },
                    legend: {
                        display: false,
                        labels: {
                            generateLabels: chart => chart.data.datasets.map((ds, i) => ({
                                text: ds.label,
                                datasetIndex: i,
                                fillStyle: chart.data.datasets[i].backgroundColor,
                                strokeStyle: chart.data.datasets[i].backgroundColor,
                                hidden: chart.getDatasetMeta(i).hidden
                            })).filter((el, i) => el.text.match(/loop/) || i % this.countStacks === 0)
                        },
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        id: "bar-stack",
                        position: "left",
                        stacked: true,
                        min: 0,
                        title: {
                            display: true,
                            text: 'Bar',
                        }
                    },
                    y2: {
                        id: "line",
                        position: "right",
                        stacked: false,
                        min: 0,
                        grid: {
                            display: false,
                        },
                        title: {
                            display: true,
                            text: 'Line',
                        }
                    }
                },
            }
        }
    },
    mounted() {
        this.lineLabel = this.metric;
        this.fetchData();
    },
    watch: {
        metric(newValue, oldValue) {
            this.lineLabel = newValue;
            this.generateLineDatasets(this.normalizedData, newValue);
        }
    },
    computed: {
        isAllSelected() {
            return (this.selectedLegend.length < this.labels.length) && this.selectedLegend.length > 0
        },
        isAllSelectCbxFilled() {
            return this.selectedLegend.length === this.labels.length
        },
    },
    methods: {
        fetchData () {
            this.initialData = [...this.barChartData];
            this.calculateStacks(this.initialData);
            if (!this.labels.length) this.pickLabels(this.initialData);
            this.normalizedData = this.normalizeData(this.initialData)
            this.generateBarDatasets(this.normalizedData);
        },
        calculateStacks(chartData) {
            this.countStacks = Object.keys(chartData[0].loops).length;
        },
        pickLabels (chartData) {
            chartData.forEach(res => {
                if (!this.labels.includes(res.name)) {
                    this.selectedLabels[res.name] = true;
                    this.selectedLegend.push(res.name)
                    this.labels.push(res.name)
                }
            })
        },
        normalizeData(data) {
            return data.reduce((acc, page) => {
                if(!this.selectedLabels[page.name]) return acc
                if (!acc[page.name]) {
                    acc[page.name] = []
                }
                for (let loop in page.loops) {
                    acc[page.name].push(page.loops[loop])
                }
                return acc;
            }, {})
        },
        setMaxYAxisValue(chartData) {
            let maxAxisValue = 0;

            for (const page in chartData) {
                chartData[page].forEach(el => {
                    const result = Object.values(el).reduce((acc, item) => {
                        acc = acc + +item;
                        return acc;
                    }, 0)
                    if (result > maxAxisValue) {
                        maxAxisValue = result
                    }
                })
            }

            let divider = 1;
            switch (true) {
                case (maxAxisValue > 100000):
                    divider = 10000;
                    break;
                case (maxAxisValue > 10000):
                    divider = 1000;
                    break;
                case (maxAxisValue > 1000):
                    divider = 100;
                    break;
                case (maxAxisValue > 100):
                    divider = 10;
                    break;
            }
            const maxYAxis = Math.round(Math.floor(maxAxisValue * 1.1) / divider) * divider;
            this.chartOptions.scales.y.max = maxYAxis;
            this.chartOptions.scales.y2.max = maxYAxis;
        },
        generateBarDatasets (chartData) {

            const datasets = [];
            const lineDataset = [];

            this.setMaxYAxisValue(chartData);

            valuesName.forEach((valueName, index) => {
                for (let i = 0; i < this.countStacks; i++) {
                    const barData = [];
                    const lineData = [];
                    for (let label in this.selectedLabels) {
                        if(this.selectedLabels[label]) {
                            barData.push(chartData[label][i][valueName])
                            if (valueName === this.lineLabel) {
                                lineData.push(chartData[label][i][valueName])
                            }
                        }
                    }
                    if (valueName === this.lineLabel) {
                        lineDataset.push({
                            label: `${this.lineLabel} loop(${i+1})`,
                            data: lineData,
                            backgroundColor: barColors[i],
                            borderColor: barColors[i],
                            stack: i,
                            order: 1,
                            yAxisID: "y2",
                        })
                    }

                    datasets.push({
                        type: 'bar',
                        label: valueName,
                        data: barData,
                        backgroundColor: barColors[index],
                        stack: i,
                        maxBarThickness: 20,
                        order: 0,
                    })
                }
            })
            datasets.push(...lineDataset)
            const labels = [];
            for (let key in this.selectedLabels) {
                if (this.selectedLabels[key]) {
                    labels.push(key)
                }
            }
            if(this.lineChart) {
                this.lineChart.destroy()
            }
            this.drawCanvas(labels, datasets)
        },
        drawCanvas(labels, datasets) {
            const ctx8 = document.getElementById("barchartX");
            this.lineChart = new Chart(ctx8, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets,
                },
                options: this.chartOptions,
                plugins: [htmlLegendPlugin],
            });
        },
        filterData (type, e) {
            const isChecked = e.target.checked

            this.selectedLabels[type] = isChecked;

            this.selectedLegend = !isChecked
                ? this.selectedLegend.filter(lg => lg !== type)
                : [...this.selectedLegend, type];

            this.normalizedData = this.normalizeData(this.initialData)
            this.generateBarDatasets(this.normalizedData);
        },
        getCbxColor(index) {
            return barColors[index];
        },
        generateLineDatasets (chartData, metric) {
            const lineDataset = []
            for (let i = 0; i < this.countStacks; i++) {
                const lineData = [];
                for (let label in this.selectedLabels) {
                    if(this.selectedLabels[label]) {
                        lineData.push(chartData[label][i][metric])
                    }
                }
                lineDataset.push({
                    label: `${this.lineLabel} loop(${i+1})`,
                    data: lineData,
                    backgroundColor: barColors[i],
                    borderColor: barColors[i],
                    stack: i,
                    order: 1,
                    yAxisID: "y2",
                })
            }
            this.lineChart.data.datasets = this.lineChart.data.datasets.filter(ds => ds.type === 'bar');
            this.lineChart.data.datasets.push(...lineDataset);
            this.lineChart.update();
        },
        selectAll({ target }) {
            const hidden = !target.checked;

            this.selectedLegend = hidden
                ? []
                : [...this.labels]

            for(const label in this.selectedLabels) {
                this.selectedLabels[label] = !hidden;
            }

            this.$refs['legendCbx'].forEach(cbx => {
                cbx.checked = !hidden;
            })
            this.normalizedData = this.normalizeData(this.initialData)
            this.generateBarDatasets(this.normalizedData);
        }
    },
    template: `
        <div>
            <div class="d-flex mt-3">
                <div class="chart flex-grow-1" style="position: relative">
                    <div 
                        v-if="loading"
                        class="layout-spinner">
                        <i class="spinner-loader__32x32 spinner-centered"></i>
                    </div>
                    <canvas id="barchartX"></canvas>
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
                        <div v-for="(label, index) in labels" class="d-flex mb-3 float-left mr-3">
                            <label
                                class="mb-0 w-100 d-flex align-items-center custom-checkbox custom-checkbox__multicolor">
                                <input
                                    class="mx-2 custom__checkbox"
                                    checked="true"
                                    @click="filterData(label, $event)"
                                    ref="legendCbx"
                                    :id="'group_'+index"
                                    :style="{'--cbx-color': getCbxColor(index)}"
                                    type="checkbox">
                                <span class="w-100 d-inline-block">{{ label }}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="d-flex mt-24">
                <div id="legend-container"></div>
                <div style="width:280px;"></div>
            </div>
        </div>

    `
}