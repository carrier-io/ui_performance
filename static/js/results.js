function reportLink(value, row, index) {
    return `<a target="_blank" href="${row.report}"><i class="fas fa-link"></i></a>`
}

function trim(value, row, index){
    return row.name.length > 40 ? row.name.substring(0, 40) : row.name
}