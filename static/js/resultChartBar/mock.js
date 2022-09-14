const valuesName = ['load_time', 'tti', 'fcp', 'dom', 'lcp', 'cls', 'tbt', 'fvc', 'lvc'];

const barColors = [
    '#5933C6',
    '#D463E7',
    '#29B8F5',
    '#F89033',
    '#D71616',
    '#18B64D',
    '#DBC714',
    '#7dda99',
    '#2963f5',
]

const newBarchartData = [
    {
        "name": "login",
        "type": "page",
        "loops": {
            "1": {
                "load_time": 758,
                "dom": 655,
                "tti": 0,
                "fcp": 543,
                "lcp": 543,
                "cls": 0.0,
                "tbt": 43,
                "fvc": 250,
                "lvc": 6563
            },
            "2": {
                "load_time": 675,
                "dom": 663,
                "tti": 0,
                "fcp": 550,
                "lcp": 650,
                "cls": 0.0,
                "tbt": 31,
                "fvc": 233,
                "lvc": 6033
            },
            "3": {
                "load_time": 784,
                "dom": 797,
                "tti": 0,
                "fcp": 531,
                "lcp": 531,
                "cls": 0.0,
                "tbt": 67,
                "fvc": 136,
                "lvc": 6666
            }
        }
    },
    {
        "name": "Barack_Obama",
        "type": "page",
        "loops": {
            "1": {
                "load_time": 2634,
                "dom": 2247,
                "tti": 0,
                "fcp": 861,
                "lcp": 861,
                "cls": 0.0,
                "tbt": 696,
                "fvc": 400,
                "lvc": 2000
            },
            "2": {
                "load_time": 2917,
                "dom": 2476,
                "tti": 0,
                "fcp": 1484,
                "lcp": 1484,
                "cls": 0.0,
                "tbt": 602,
                "fvc": 413,
                "lvc": 2310
            },
            "3": {
                "load_time": 2679,
                "dom": 2170,
                "tti": 0,
                "fcp": 979,
                "lcp": 979,
                "cls": 0.0,
                "tbt": 655,
                "fvc": 100,
                "lvc": 2066
            }
        }
    },
    {
        "name": "President_of_the_United_States",
        "type": "page",
        "loops": {
            "1": {
                "load_time": 3770,
                "dom": 3865,
                "tti": 0,
                "fcp": 3296,
                "lcp": 3296,
                "cls": 0.0,
                "tbt": 319,
                "fvc": 3470,
                "lvc": 3764
            },
            "2": {
                "load_time": 1324,
                "dom": 1654,
                "tti": 0,
                "fcp": 946,
                "lcp": 946,
                "cls": 0.0,
                "tbt": 375,
                "fvc": 1115,
                "lvc": 1600
            },
            "3": {
                "load_time": 1258,
                "dom": 1562,
                "tti": 0,
                "fcp": 971,
                "lcp": 971,
                "cls": 0.0,
                "tbt": 250,
                "fvc": 1166,
                "lvc": 1500
            }
        }
    }
]

// barTypes = {
//     pages: [
//         {
//             tcp: 21,
//             lcs: 22
//         },
//         {
//             tcp: 81,
//             lcs: 82
//         }
//     ],
//     opera: [
//         {
//             tcp: 21,
//             lcs: 22
//         },
//         {
//             tcp: 81,
//             lcs: 82
//         }
//     ]
// }

// const datasets = [
//     {
//         label: 'tcp',
//         data: [4, 4], // pages[0].tcp , opera[0].tcp
//         backgroundColor: '#5933C6',
//         stack: 0,
//     },
//     {
//         label: 'tcp',
//         data: [4, 4], // pages[1].tcp , opera[1].tcp
//         backgroundColor: '#c73298',
//         stack: 1,
//     },
//     // next values
//     {
//         label: 'tti',
//         data: [4, 4], // pages[0].tti , opera[0].tti
//         backgroundColor: '#5933C6',
//         stack: 0,
//     },
//     {
//         label: 'tti',
//         data: [4, 4], // pages[1].tti , opera[1].tti
//         backgroundColor: '#c73298',
//         stack: 1,
//     }
// ]
