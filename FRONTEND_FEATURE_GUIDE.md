# UI Performance Plugin: Frontend Feature Implementation Guide

This guide explains how to implement new UI features in the `ui_performance` plugin, including adding Vue modals, table actions, and user confirmation flows. It is intended for developers and LLM agents working on this plugin.

## 1. Creating a New Vue Modal Component

- Create a JS file in `static/js/`, e.g. `confirm_delete_ui_test.js`.
- Use the following structure:

```js
const MyModal = {
    delimiters: ['[[', ']]'],
    data() {
        return { is_open: false, /* your state */ }
    },
    template: `...`,
    methods: {
        show(/* args */) { this.is_open = true; $(this.$el).modal('show'); },
        hide() { this.is_open = false; $(this.$el).modal('hide'); },
        confirmAction() { /* your logic */ this.hide(); }
    }
}
register_component('MyModal', MyModal);
```

## 2. Register the Modal in the Main Template

- In `templates/core/content.html`, add your modal:

```html
<My-Modal
    @register="register"
    instance_name="my_modal"
    modal_id="my_modal"
></My-Modal>
```

## 3. Import the Modal JS File

- In `templates/core/scripts.html`, add:

```html
<script src="{{ url_for('ui_performance.static', filename='js/my_modal.js') }}"></script>
```

## 4. Invoke the Modal from JS (Table Actions)

- In your table formatters (e.g. `core.js`), update action events:

```js
"click .action_delete": function (e, value, row, index) {
    const modal = vueVm.registered_components.my_modal;
    modal.show([row.id], [row.name]);
}
```

- For bulk actions (header buttons):

```js
$('#delete_items').on('click', function() {
    const selected = vueVm.registered_components.table_items?.table_action('getSelections');
    if (!selected || selected.length === 0) return;
    const ids = selected.map(item => item.id);
    const names = selected.map(item => item.name);
    vueVm.registered_components.my_modal.show(ids, names);
});
```

## 5. Implement the Backend Call

- In the modal's `confirmAction`, call your backend function with the correct format (e.g. comma-separated IDs):

```js
my_delete_function(this.ids.join(','));
```

## 6. Best Practices

- Use `delimiters: ['[[', ']]']` for Vue templates.
- Register each modal with a unique `instance_name`.
- Use consistent modal invocation and registration patterns.
- Match backend API requirements for argument formats.
- Always show a confirmation modal for destructive actions.

## 7. Example Features

- See `confirm_delete_ui_test.js`, `confirm_delete_ui_threshold.js`, `confirm_delete_ui_result.js` for user confirmation modals.
- See `core.js` and `thresholds.js` for table action integration.

## 8. Troubleshooting

- If bulk actions only affect one item, check the format of arguments passed to backend (array vs. string).
- Use browser console to inspect network requests and debug issues.

---

For further examples, review:
- `static/js/confirm_delete_ui_test.js`
- `static/js/confirm_delete_ui_threshold.js`
- `static/js/confirm_delete_ui_result.js`
- `static/js/core.js`
- `static/js/thresholds.js`
- `templates/core/content.html`
- `templates/core/scripts.html`

This guide will help you quickly add new UI features and modals to the `ui_performance` plugin.
