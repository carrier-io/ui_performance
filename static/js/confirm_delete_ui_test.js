// Vue component for UI test delete confirmation modal
const ConfirmDeleteUiTestModal = {
    delimiters: ['[[', ']]'],
    data() {
        return {
            is_open: false,
            test_ids: [],
            test_names: [],
        }
    },
    template: `
        <div class="modal fade" tabindex="-1" role="dialog" id="confirmDeleteUiTestModal" :class="{show: is_open}" style="display: [[ is_open ? 'block' : 'none' ]]">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Delete</h5>
                        <button type="button" class="close" @click="hide" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <template v-if="test_ids.length > 1">
                            <p>Are you sure you want to delete <b>[[ test_ids.length ]]</b> UI tests?</p>
                            <ul>
                                <li v-for="name in test_names" :key="name">[[ name ]]</li>
                            </ul>
                        </template>
                        <template v-else>
                            <p>Are you sure you want to delete the UI test "<b>[[ test_names[0] ]]</b>"?</p>
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
        show(test_ids, test_names) {
            this.test_ids = Array.isArray(test_ids) ? test_ids : [test_ids];
            this.test_names = Array.isArray(test_names) ? test_names : [test_names];
            this.is_open = true;
            $(this.$el).modal('show');
        },
        hide() {
            this.is_open = false;
            $(this.$el).modal('hide');
        },
        confirmDelete() {
            ui_test_delete(this.test_ids.join(','));
            this.hide();
        }
    }
}
register_component('ConfirmDeleteUiTestModal', ConfirmDeleteUiTestModal);
