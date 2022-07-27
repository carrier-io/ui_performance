function createTest() {
          var checked = []
          var params = get_script_params();
          $("input:checkbox:checked").each(function() {
            checked.push($(this).attr("id"));
          });

          event.preventDefault();
          $('#loops').val('1')

          var data = new FormData();

          git_settings = {}
          if ($('#repo').val() != '' || $('#repo_https').val() != '') {
              git_settings["repo"] = $('#repo').val() != '' ? $('#repo').val() : $('#repo_https').val()
              git_settings["protocol"] = $('#repo').val() != '' ? 'ssh' : 'https'
              git_settings["repo_user"] = $('#repo_user').val()
              git_settings["repo_pass"] = $('#repo_pass').val()
              git_settings["repo_key"] = $('#repo_key').val()
              git_settings["repo_branch"] = $('#repo_branch').val() ? $('#repo_branch').val() : $('#repo_branch_https').val()
              data.append('git', JSON.stringify(git_settings));
          } else if ($('#file')[0].files[0] != undefined) {
              data.append('file', $('#file')[0].files[0], $('#file')[0].files[0].name);
          } else if ($('#local_file').val() != '') {
              data.append('local_path', $('#local_file').val());
          }

          data.append('name', $('#test_name').val());
          data.append('loops', $('#loops').val());
          //data.append('region', $('#ui_region option:selected').text());
          data.append('region', 'default');
          data.append('runner', $('#runner').val());
          data.append('entrypoint', $('#entrypoint').val());
          data.append('browser', $('#browsers .filter-option-inner-inner').text());
          data.append('reporter', checked);
          data.append('params', JSON.stringify(params[0]));
          data.append('env_vars', JSON.stringify(params[1]));
          data.append('customization', JSON.stringify(params[2]));
          data.append('cc_env_vars', JSON.stringify(params[3]));
          data.append('aggregation', $('#aggregation').children("option:selected").val());
          $.ajax({
              url: `/api/v1/ui_performance/tests/${getSelectedProjectId()}`,
              data: data,
              cache: false,
              contentType: false,
              processData: false,
              method: 'POST',
              success: function(data){
                  $("#createUITestModal").modal('hide');
                  $("#tests-list").bootstrapTable('refresh')
              }
            }
          );
}

function get_script_params() {
      var script_params = []
      var env_vars = {}
      var cc_env_vars = {}
      var extensions = {}
      script_params.push({
        "name": "test_name",
        "default": $('#test_name').val(),
        "description": "Name of the test",
        "type": "",
        "action": ""
      })
      script_params.push({
        "name": "env_type",
        "default": $('#test_env').val(),
        "description": "Env type (tag for filtering)",
        "type": "",
        "action": ""
      })
      script_params.push({
        "name": "test_type",
        "default": $('#test_type').val(),
        "description": "Test type (tag for filtering)",
        "type": "",
        "action": ""
      })
      $("#ui_test_params").bootstrapTable('getData').forEach((param) => {
        script_params.push(param)
      })

      env_vars["cpu_quota"] = $('#ui_cpu').text();
      env_vars["memory_quota"] = $('#ui_memory').val();

      return [script_params, env_vars, extensions, cc_env_vars];
}

function uiTestActionFormatter(value, row, index) {
    return `
    <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-24 btn-action" onclick="runUITestModal('${row.id}')" data-toggle="tooltip" data-placement="top" title="Run Test"><i class="fas fa-play"></i></button>
        <button type="button" class="btn btn-24 btn-action" onclick="editTest('${row.id}')"><i class="fas fa-cog"></i></button>
        <button type="button" class="btn btn-24 btn-action"><i class="fas fa-share-alt"></i></button>
        <button type="button" class="btn btn-24 btn-action" onclick="deleteTests('${row.id}')"><i class="fas fa-trash-alt"></i></button>
    </div>
    `
}

function backendLgFormatter(value, row, index) {
    if (row.runner.includes("browsertime")) {
        return '<img src="/design-system/static/assets/ico/sitespeed.png" width="20">'
    } else if (row.runner.includes("lighthouse")) {
        return '<img src="/design-system/static/assets/ico/lighthouse.png" width="20">'
    } else {
        return value
    }
}

function runUITestModal(test_id) {
    $("#runUITestModal").modal('show');
    var test_data = $('#tests-list').bootstrapTable('getRowByUniqueId', test_id);
    $('#runner_test_params').bootstrapTable('removeAll')
    test_data.params.forEach((param) => {
        $('#runner_test_params').bootstrapTable('append', param)
    })
    $('#run_test').removeAttr('onclick');
    $('#run_test').attr('onClick', `runUITest("${test_data.test_uid}")`);
}

function runUITest(test_id) {
    var params = []
    $("#runner_test_params").bootstrapTable('getData').forEach((param) => {
        params.push(param)
    })
    var env_vars = {}
    //env_vars["cpu_quota"] = $('#runner_cpu').text()
    //env_vars["memory_quota"] = $('#runner_memory').val()
    var cc_env_vars = {}
    var data = {
        'params': JSON.stringify(params),
        'env_vars': JSON.stringify(env_vars),
        'cc_env_vars': JSON.stringify(cc_env_vars),
        'parallel': 1,
        'region': "default"
    }
    $.ajax({
        url: `/api/v1/ui_performance/test/${getSelectedProjectId()}/${test_id}`,
        data: JSON.stringify(data),
        contentType: 'application/json',
        type: 'POST',
        success: function(result) {
            $("#runUITestModal").modal('hide');
            $("#results-list").bootstrapTable('refresh')
        }
    });
}

function reportsStatusFormatter(value, row, index) {
    switch (value.toLowerCase()) {
        case 'error':
            return `<div style="color: var(--red)"><i class="fas fa-exclamation-circle error"></i> ${value}</div>`
        case 'failed':
            return `<div style="color: var(--red)"><i class="fas fa-exclamation-circle error"></i> ${value}</div>`
        case 'success':
            return `<div style="color: var(--green)"><i class="fas fa-exclamation-circle error"></i> ${value}</div>`
        case 'canceled':
            return `<div style="color: var(--gray)"><i class="fas fa-times-circle"></i> ${value}</div>`
        case 'finished':
            return `<div style="color: var(--info)"><i class="fas fa-check-circle"></i> ${value}</div>`
        case 'in progress':
            return `<div style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value}</div>`
        case 'post processing':
            return `<div style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value}</div>`
        case 'pending...':
            return `<div style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value}</div>`
        case 'preparing...':
            return `<div style="color: var(--basic)"><i class="fas fa-spinner fa-spin fa-secondary"></i> ${value}</div>`
        default:
            return value
    }
}

function createLinkToUIReport(value, row, index) {
    return `<a class="test form-control-label" href="./results?result_id=${row.id}" role="button">${row.name}</a>`
}
