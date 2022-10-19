const UiResultTable = {
    props: ['url', 'selectedLoop'],
    data() {
        return {
            dataTable: []
        }
    },
    watch: {
        selectedLoop(newValue, oldValue) {
            const table = document.getElementById("ui_summary_table");
            const tr = table.getElementsByTagName("tr");
            if (newValue === 'all') {
                for (let i = 0; i < tr.length; i++) {
                    tr[i].style.display = "";
                }
                return
            }
            for (let i = 0; i < tr.length; i++) {
                const td = tr[i].getElementsByTagName("td")[1];
                if (td) {
                    const txtValue = td.textContent || td.innerText;
                    if (txtValue.toUpperCase().indexOf(newValue) > -1) {
                        tr[i].style.display = "";
                    } else {
                        tr[i].style.display = "none";
                    }
                }
            }
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
                    <div class="d-flex">
                        <select class="selectpicker btn-secondary_item__left" data-style="btn_item__left">
                            <option data-content="Mustard<i class='fa fa-edit'></i>"></option>
                            <option data-content="Ketchup<i class='fa fa-trash'></i>"></option>
                            <option data-content="Relish<i class='fa fa-cog'></i>"></option>
                        </select>
                        <div class="dropdown dropdown_action">
                            <button class="btn dropdown-toggle btn-secondary_item__right"
                                    role="button"
                                    aria-expanded="false">
                                <i class="fa fa-cog"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <table class="table table-border"
                       id="ui_summary_table"
                       :data-url="url"
                       data-toggle="table"
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