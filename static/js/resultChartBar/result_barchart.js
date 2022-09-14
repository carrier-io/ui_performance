const labels = [];
const selectedLabels = {}
let initialData = null;
let countStacks = 0;
let lineLabel = 'load_time';
let normalizedData = null;
let uiTimePicker = null;

function pickLabels (chartData) {
    chartData.forEach(res => {
        if (!labels.includes(res.name)) {
            selectedLabels[res.name] = true;
            labels.push(res.name)
        }
    })
    generateRequestList();
}

function calculateStacks(chartData) {
    countStacks = Object.keys(chartData[0].loops).length;
}

const generateLineDatasets = (chartData, selectedMetric) => {
    const lineDataset = []
    for (let i = 0; i < countStacks; i++) {
        const lineData = [];
        for (let label in selectedLabels) {
            if(selectedLabels[label]) {
                lineData.push(chartData[label][i][selectedMetric])
            }
        }
        lineDataset.push({
            label: `${lineLabel} loop(${i+1})`,
            data: lineData,
            backgroundColor: barColors[i],
            borderColor: barColors[i],
            stack: i,
            order: 1,
            yAxisID: "y2",
        })
    }
    window.chart8.data.datasets = window.chart8.data.datasets.filter(ds => ds.type === 'bar');
    window.chart8.data.datasets.push(...lineDataset);
    window.chart8.update();
}

const generateBarDatasets = (chartData) => {
    const datasets = [];
    const lineDataset = [];
    valuesName.forEach((valueName, index) => {
        for (let i = 0; i < countStacks; i++) {
            const barData = [];
            const lineData = [];
            for (let label in selectedLabels) {
                if(selectedLabels[label]) {
                    barData.push(chartData[label][i][valueName])
                    if (valueName === lineLabel) {
                        lineData.push(chartData[label][i][valueName])
                    }
                }
            }
            if (valueName === lineLabel) {
                lineDataset.push({
                    label: `${lineLabel} loop(${i+1})`,
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
    for (let key in selectedLabels) {
        if (selectedLabels[key]) {
            labels.push(key)
        }
    }
    if(window.chart8) {
        window.chart8.destroy()
    }
    drawChart(labels, datasets)
}

const fetchData = async () => {
    $('#chart-loader').show();
    const result_test_id = new URLSearchParams(location.search).get('result_id')
    const res = await fetch(`/api/v1/ui_performance/barchart/${getSelectedProjectId()}/${result_test_id}`, {
        method: 'GET',
    })
    initialData = await res.json();
    calculateStacks(initialData);
    if (!labels.length) pickLabels(initialData);

    let low_value = 0;
    let high_value = 100;
    uiTimePicker = noUiSlider.create($("#vuh-perfomance-time-picker")[0], {
        range: {
            'min': 0,
            'max': 100
        },
        start: [low_value, high_value],
        connect: true,
        format: wNumb({
            decimals: 0
        }),
    })

    uiTimePicker.on('set', function(values) {
        low_value = values[0]
        high_value = values[1]
        resizeChart();
    });

    normalizedData = normalizeData(initialData)
    generateBarDatasets(normalizedData)
    $('#chart-loader').hide();
}

function normalizeData(data) {
    return data.reduce((acc, page) => {
        if(!selectedLabels[page.name]) return acc
        if (!acc[page.name]) {
            acc[page.name] = []
        }
        for (let loop in page.loops) {
            acc[page.name].push(page.loops[loop])
        }
        return acc;
    }, {})
}

function filterData (type, e) {
    selectedLabels[type] = e.target.checked;
    normalizedData = normalizeData(initialData)
    generateBarDatasets(normalizedData);
    if (isSomeSelected()) {
        $('label[for="all_checkbox"]').addClass('custom-checkbox__minus');
        $('#all_checkbox').prop('checked', false);
    } else if(calcSelectedLabels() === 0) {
        $('label[for="all_checkbox"]').removeClass('custom-checkbox__minus');
        $('#all_checkbox').prop('checked', false);
    } else {
        $('label[for="all_checkbox"]').removeClass('custom-checkbox__minus');
        $('#all_checkbox').prop('checked', true);
    }
}

const trend_options = {
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
                })).filter((el, i) => el.text.match(/loop/) || i % countStacks === 0)
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
            ticks: {
                beginAtZero: true
            },
            title: {
                display: true,
                text: 'Bar',
            }
        },
        y2: {
            id: "line",
            position: "right",
            stacked: false,
            grid: {
                display: false,
            },
            title: {
                display: true,
                text: 'Line',
            }
        }
    },
};

const generateRequestList = () => {
    const groupsList = labels.map((label, index) => {
        return `<div class="d-flex mb-3 float-left mr-3">
            <label
                class="mb-0 w-100 d-flex align-items-center custom-checkbox custom-checkbox__multicolor legend-item">
                <input class="mx-2 custom__checkbox"
                       id="group_${index}"
                       type="checkbox"
                       checked="true"
                       onclick="filterData('${label}', event)"
                       style="--cbx-color: ${barColors[index]}"/>
                <span class="legend-span">${label}</span>
            </label>
        </div>`
    }).join('')

    document.getElementById('chart-group-legend').innerHTML = groupsList;
}

function drawChart(labels, datasets) {
    const ctx8 = document.getElementById("barchart");
    window.chart8 = new Chart(ctx8, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: trend_options,
        plugins: [htmlLegendPlugin],
    });
}

function renderBc() {
    fetchData();
    $('#metric').on("changed.bs.select", function() {
        lineLabel = this.value;
        generateLineDatasets(normalizedData, this.value);
    });
}

function selectOrUnselectRequests() {
    $('label[for="all_checkbox"]').removeClass('custom-checkbox__minus');
    if ($('#all_checkbox').is(":checked")) {
        selectOrUnselectAllLabels(true);
        $('#chart-group-legend .custom__checkbox').each(function(i, ch) {
            if (ch.id != "all_checkbox") {
                $('#'+ch.id).prop('checked', true);
            }
        });
    } else {
        selectOrUnselectAllLabels(false);
        $('#chart-group-legend .custom__checkbox').each(function(i, ch) {
            if (ch.id != "all_checkbox") {
                $('#'+ch.id).prop('checked', false);
            }
        });
    }
    normalizedData = normalizeData(initialData)
    generateBarDatasets(normalizedData);
}

function selectOrUnselectAllLabels(value) {
    for (const label in selectedLabels) {
        selectedLabels[label] = value;
    }
}

function calcSelectedLabels() {
    const countSelectedLabels = [];
    for (const label in selectedLabels) {
        if (selectedLabels[label]) {
            countSelectedLabels.push(label)
        }
    }
    return countSelectedLabels.length;
}

function isSomeSelected() {
    return (calcSelectedLabels() < labels.length) && calcSelectedLabels() > 0;
}