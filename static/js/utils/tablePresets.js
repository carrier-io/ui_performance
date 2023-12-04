const defaultPresetsTableData = [
    {
        title: "page name",
        field: "name",
        checked: true,
    },
    {
        title: "identifier",
        field: "identifier",
        checked: true,
    },
    {
        title: "type",
        field: "type",
        checked: true,
    },
    {
        title: "loop",
        field: "loop",
        checked: true,
    },
    {
        title: "load time",
        field: "load_time",
        checked: true,
    },
    {
        title: "dom",
        field: "dom",
        checked: false,
    },
    {
        title: "tti",
        field: "tti",
        checked: false,
    },
    {
        title: "fcp",
        field: "fcp",
        checked: false,
    },
    {
        title: "lcp",
        field: "lcp",
        checked: false,
    },
    {
        title: "cls",
        field: "cls",
        checked: false,
    },
    {
        title: "tbt",
        field: "tbt",
        checked: false,
    },
    {
        title: "fvc",
        field: "fvc",
        checked: false,
    },
    {
        title: "lvc",
        field: "lvc",
        checked: false,
    },
]

const tableSummaryColumns = defaultPresetsTableData.map(col => {
    return {
        title: col.title,
        field: col.field,
        sortable: true,
    }
})

const defaultPreset = {
    "name": "default",
    "fields": defaultPresetsTableData.filter(col => col.checked).map(field => field.field),
}

const allFields = defaultPresetsTableData.map(col => col.field)

