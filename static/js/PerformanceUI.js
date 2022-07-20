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
          data.append('region', $('#ui_region option:selected').text());
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
      var script_params = {}
      var env_vars = {}
      var cc_env_vars = {}
      var extensions = {}
      $("#script_params .input-group").each(function() {
           if ($(this).children()[0].value !== "" && $(this).children()[1].value !== "") {
                script_params[$(this).children()[0].value] = $(this).children()[1].value;
           }
      });
      $("#env_vars .input-group").each(function() {
           if ($(this).children()[0].value !== "" && $(this).children()[1].value !== "") {
                env_vars[$(this).children()[0].value] = $(this).children()[1].value;
           }
      });
      env_vars["cpu_quota"] = $('#ui_cpu').text();
      env_vars["memory_quota"] = $('#ui_memory').val();
      $("#customs .input-group").each(function() {
           if ($(this).children()[0].value !== "" && $(this).children()[1].value !== "") {
                extensions[$(this).children()[0].value] = $(this).children()[1].value;
           }
      });
      $("#cc_env_vars .input-group").each(function() {
           if ($(this).children()[0].value !== "" && $(this).children()[1].value !== "") {
                cc_env_vars[$(this).children()[0].value] = $(this).children()[1].value;
           }
      });

      return [script_params, env_vars, extensions, cc_env_vars];
}

function uiTestActionFormatter(value, row, index) {
    return `
    <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-24 btn-action" onclick="runTestModal('${row.id}')" data-toggle="tooltip" data-placement="top" title="Run Test"><i class="fas fa-play"></i></button>
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
