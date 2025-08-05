// Vue component for UI results delete confirmation modal
const ConfirmDeleteUiResultModal = {
    delimiters: ['[[', ']]'],
    data() {
        return {
            is_open: false,
            result_ids: [],
            result_names: [],
        }
    },
    template: `
        <div class="modal fade" tabindex="-1" role="dialog" id="confirmDeleteUiResultModal" :class="{show: is_open}" style="display: [[ is_open ? 'block' : 'none' ]]">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Delete</h5>
                        <button type="button" class="close" @click="hide" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <template v-if="result_ids.length > 1">
                            <p>Are you sure you want to delete <b>[[ result_ids.length ]]</b> results?</p>
                            <ul>
                                <li v-for="name in result_names" :key="name">[[ name ]]</li>
                            </ul>
                        </template>
                        <template v-else>
                            <p>Are you sure you want to delete the result "<b>[[ result_names[0] ]]</b>"?</p>
                        </template>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="hide">Cancel</button>
                        <button type="button" class="btn btn-danger" @click="confirmDelete">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        show(result_ids, result_names) {
            this.result_ids = Array.isArray(result_ids) ? result_ids : [result_ids];
            this.result_names = Array.isArray(result_names) ? result_names : [result_names];
            this.is_open = true;
            $(this.$el).modal('show');
        },
        hide() {
            this.is_open = false;
            $(this.$el).modal('hide');
        },
        confirmDelete() {
            ui_results_delete(this.result_ids.join(','));
            this.hide();
        }
    }
}
register_component('ConfirmDeleteUiResultModal', ConfirmDeleteUiResultModal);
