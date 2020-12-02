var pug = require('pug');
var fs = require('fs');
var jsonfile = require('../test/report.json')

// Compile the template to a function string
//var jsFunctionString = pug.compileFileClient('./templates/file.pug', {name: "fancyTemplateFun"});

// Compile a function
var fn = pug.compileFile('./views/file.pug');

// Render the function
var html = fn({ 
    lastrun_date: "today",
    daterun_start: "02/12/2020 17:00",
    daterun_end: "02/12/2020 17h30",
    opsys: "Windows",
    chart_passed: "#2cd860 0, #2cd860 88%,",
    chart_failed: "#de3f3f 0, #de3f3f 94%,",
    chart_skipped: "#fdb563 0, #fdb563 100%",
    run_suites: 5,
    run_numerator: 35,
    pass_percent: 88.5,
    pass_numerator: 31,
    fail_percent: 5.71,
    fail_numerator: 2,
    skip_percent: 5.71,
    skip_numerator: 2,
    tests: jsonfile.results
})

// Maybe you want to compile all of your templates to a templates.js file and serve it to the client
fs.writeFileSync("./html/templates.html", html);