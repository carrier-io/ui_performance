const QualityGate = {
    delimiters: ['[[', ']]'],
    props: ['instance_name', 'section', 'selected_integration', 'is_selected'],
    emits: ['set_data', 'clear_data'],
    delimiters: ['[[', ']]'],
    data() {
        return this.initialState()
    },
    methods: {
        get_data() {
            if (this.is_selected) {
                const {deviation, missed_thresholds, baseline_deviation} = this
                return {deviation, missed_thresholds, baseline_deviation}
            }
        },
        set_data(data) {
            console.log('set_data', data)
            const {id, ...rest} = data
            this.load(rest)
            this.$emit('set_data', {id: 'quality_gate'})
        },
        clear_data() {
            Object.assign(this.$data, this.initialState())
            this.$emit('clear_data')
        },
        load(data) {
            Object.assign(this.$data, {...this.initialState(), ...data})
        },
        set_error(data) {
            this.errors[data.loc[data.loc.length - 1]] = data.msg
        },
        clear_errors() {
            this.errors = {}
        },
        initialState: () => ({
            deviation: 20,
            missed_thresholds: 50,
            baseline_deviation: -1,
            errors: {},
        })
    },
    template: `
    <div class="row">
        <div class="d-flex gap-3 flex-wrap"
            ref="settings"
        >
            <div class="flex-grow-1" style="min-width: 250px;">
                <p class="font-h6 font-semibold mb-1">Deviation, %</p>
                <input type="number" class="form-control" placeholder="Deviation"
                    v-model="deviation"
                    :class="{ 'is-invalid': errors.deviation }"
                >
                <small class="form-text text-muted">
                    Acceptable deviation in test results, used for comparison with thresholds and baseline. Set to -1 to disable.
                </small>
                <div class="invalid-feedback">[[ errors.deviation ]]</div>
            </div>

            <div class="flex-grow-1" style="min-width: 250px;">
                <p class="font-h6 font-semibold mb-1">Missed thresholds, %</p>
                <input type="number" class="form-control" placeholder="Missed thresholds"
                    v-model="missed_thresholds"
                    :class="{ 'is-invalid': errors.missed_thresholds }"
                >
                <small class="form-text text-muted">
                    Maximum percentage of thresholds that can fail. Set to -1 to disable.
                </small>
                <div class="invalid-feedback">[[ errors.missed_thresholds ]]</div>
            </div>

            <div class="flex-grow-1" style="min-width: 250px;">
                <p class="font-h6 font-semibold mb-1">Baseline Deviation, %</p>
                <input type="number" class="form-control" placeholder="Baseline deviation"
                    v-model="baseline_deviation"
                    :class="{ 'is-invalid': errors.baseline_deviation }"
                >
                <small class="form-text text-muted">
                    Maximum performance degradation from baseline. Test fails if metrics exceed this percentage. Set to -1 to disable.
                </small>
                <div class="invalid-feedback">[[ errors.baseline_deviation ]]</div>
            </div>
        </div>
    </div>
    `,
}

register_component('quality-gate', QualityGate)
