function reportLink(value, row, index) {
    return `<a target="_blank" href="${row.report}"><i class="fas fa-link"></i></a>`
}

function trim(value, row, index){
    return row.name.length > 40 ? row.name.substring(0, 40) : row.name
}

const reRunTest = () => {
    const result_test_id = new URLSearchParams(location.search).get('result_id')
    fetch(`/api/v1/ui_performance/rerun/${result_test_id}`, {
        method: 'POST'
    }).then(response => {
        if (response.ok) {
            response.json().then(({result_id}) => {
                // search.set('result_test_id', result_id)
                alertMain.add(
                    `Test rerun successful! Check out the <a href="?result_id=${result_id}">result page</a>`,
                    'success-overlay',
                    true
                )
            })
        } else {
            response.text().then(data => {
                alertMain.add(data, 'danger')
            })
        }
    })
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
})
