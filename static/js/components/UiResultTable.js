const UiResultTable = {
    props: ['url', 'selectedLoop'],
    data() {
        return {
            selectedType: 'all',
        }
    },
    watch: {
        selectedLoop(newValue, oldValue) {
            this.filterTable(this.selectedType, newValue);
        }
    },
    mounted() {
        const vm = this;
        $('.custom-tabs a[data-toggle="pill"]').on('shown.bs.tab', function (event) {
            const tabType = $(event.target).text().toLowerCase();
            const singleType = tabType === 'all' ? tabType : tabType.substring(0, tabType.length - 1);
            vm.selectedType = singleType;
            vm.filterTable(vm.selectedType, vm.selectedLoop);
        })
    },
    methods: {
        filterTable(type, loop) {
            $('#ui_summary_table').bootstrapTable('filterBy', {
                type: type,
                loop: loop,
            }, {
                'filterAlgorithm': (row, filters) => {
                    if (filters.type === 'all' && filters.loop === 'all') return true;

                    if (filters.loop === 'all') {
                        const type = filters ? filters.type : '';
                        return row.type.includes(type);
                    }
                    if (filters.type === 'all') {
                        const loop = filters ? filters.loop : '';
                        return row.loop.includes(loop);
                    }
                    const type = filters ? filters.type : '';
                    const loop = filters ? filters.loop : '';
                    return row.type.includes(type) && row.loop.includes(loop);
                }
            })
        }
    },
    template: `
        <div class="card card-12 pb-4 card-table">
            <div class="card-header d-flex justify-content-between">
                <div class="d-flex justify-content-end align-items-center pb-4">
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
            <div class="card-body">
                <table class="table table-border"
                       id="ui_summary_table"
                       :data-url="url"
                       data-toggle="table"
                       data-sort-name="loop"
                       data-sort-order="asc"
                       data-page-size=10
                       data-pagination="true"
                       data-pagination-parts='["pageInfoShort", "pageList"]'>
                    <thead class="thead-light">
                    <tr>
                        <th scope="col" data-sortable="true" data-formatter=trim>Page Name</th>
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
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        </div>
    `
}