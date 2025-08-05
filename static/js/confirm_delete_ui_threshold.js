// Vue component for UI threshold delete confirmation modal
const ConfirmDeleteUiThresholdModal = {
    delimiters: ['[[', ']]'],
    data() {
        return {
            is_open: false,
            threshold_ids: [],
            threshold_names: [],
        }
    },
    template: `
        <div class="modal fade" tabindex="-1" role="dialog" id="confirmDeleteUiThresholdModal" :class="{show: is_open}" style="display: [[ is_open ? 'block' : 'none' ]]">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Delete</h5>
                        <button type="button" class="close" @click="hide" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <template v-if="threshold_ids.length > 1">
                            <p>Are you sure you want to delete <b>[[ threshold_ids.length ]]</b> thresholds?</p>
                            <ul>
                                <li v-for="name in threshold_names" :key="name">[[ name ]]</li>
                            </ul>
                        </template>
                        <template v-else>
                            <p>Are you sure you want to delete the threshold for test "<b>[[ threshold_names[0] ]]</b>"?</p>
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
        show(threshold_ids, threshold_names) {
            this.threshold_ids = Array.isArray(threshold_ids) ? threshold_ids : [threshold_ids];
            this.threshold_names = Array.isArray(threshold_names) ? threshold_names : [threshold_names];
            this.is_open = true;
            $(this.$el).modal('show');
        },
        hide() {
            this.is_open = false;
            $(this.$el).modal('hide');
        },
        confirmDelete() {
            threshold_delete(this.threshold_ids.join(','));
            this.hide();
        }
    }
}
register_component('ConfirmDeleteUiThresholdModal', ConfirmDeleteUiThresholdModal);
