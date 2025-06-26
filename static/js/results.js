function reportLink(value, row, index) {
    return `<a target="_blank" href="${row.report}"><i class="fas fa-link"></i></a>`
}

function trim(value, row, index){
    return row.name.length > 40 ? row.name.substring(0, 40) : row.name
}

$(document).on('vue_init', () => {
    const disable_inputs = () => {
        $('#config_modal span[contenteditable]').attr('contenteditable', false)
        $('#config_modal input').attr('disabled', true)
        $('#config_modal input[type=text]').attr('readonly', true)
        $('#config_modal button').attr('disabled', true)
        $('#config_modal button[data-toggle=collapse]').attr('disabled', false)
        $('#config_modal button[data-dismiss=modal]').attr('disabled', false)
    }
    disable_inputs()
    $('#show_config_btn').on('click', disable_inputs)

    let result_id = new URLSearchParams(location.search).get('result_id')
    const setBaseline = async () => {
        const resp = await fetch(`/api/v1/ui_performance/baseline/${getSelectedProjectId()}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                report_id: result_id
            })

        })
        resp.ok ? showNotify('SUCCESS', 'Baseline set') : showNotify('ERROR', 'Error settings baseline')
    }
    $('#set_baseline').on('click', setBaseline)

    const stopTest = async () => {
        console.log("Cancel test triggered")
        let result_id = new URLSearchParams(location.search).get('result_id')
        const resp = await fetch(`/api/v1/ui_performance/report_status/${getSelectedProjectId()}/${result_id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "test_status": {
                    "status": "Canceled",
                    "percentage": 100,
                    "description": "Test was canceled"
                }
            })
        })
        resp.ok ? location.reload() : console.warn('stop test failed', resp)
    }
    $('#stop_test').on('click', stopTest)
})
