const fse = require('fs-extra')
const path = require("path")
const glob = require('glob')
var pug = require('pug');
const { flatMap } = require('./utils')

/*
* mkdir recursively - this is included in node 10, but I'm using node 8
* from: https://stackoverflow.com/a/40686853/827842
*/
function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fse.mkdirSync(curDir);
    } catch (err) {
      if (err.code === 'EEXIST') { // curDir already exists!
        return curDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }
      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
      if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
}

function resolveOptions({ files = [], infos, reportDir } = {}) {
  return {
    files: files.length ? files : ['./mochawesome-report/mochawesome*.json'],
    infos: infos ? infos : "",
    reportDir: reportDir ? reportDir : "./mocha-custom-reporter/"
  }
}

const collectSourceFiles = flatMap(pattern => {
  const files = glob.sync(pattern)
  if (!files.length) {
    throw new Error(`Pattern ${pattern} matched no report files`)
  }
  return files
})

function generateStats(suites) {
  const tests = getAllTests(suites)
  const passes = tests.filter(test => test.pass)
  const pending = tests.filter(test => test.pending)
  const failures = tests.filter(test => test.fail)
  const skipped = tests.filter(test => test.skipped)
  return {
    suites: suites.length,
    tests: tests.length,
    passes: passes.length,
    pending: pending.length,
    failures: failures.length,
    start: new Date().toISOString(),
    end: new Date().toISOString(),
    duration: tests.map(test => test.duration).reduce((a, b) => a + b, 0),
    testsRegistered: tests.length,
    passPercent: (passes.length * 100) / tests.length,
    pendingPercent: (pending.length * 100) / tests.length,
    other: 0,
    hasOther: false,
    skipped: skipped.length,
    hasSkipped: !!skipped.length,
  }
}

function collectReportFiles(files) {
  return Promise.all(files.map(filename => fse.readJson(filename)))
}

const collectReportSuites = flatMap(report =>
  report.results.filter(r => r !== false)
)

const collectReportTests = flatMap(report =>
  report.suites.filter(r => r !== false)
)

const collectReportTest = flatMap(report =>
  report.tests.filter(r => r !== false)
)

const getAllTests = flatMap(suite => [
  ...suite.tests,
  ...getAllTests(suite.suites),
])

const getStateTimeSpan = reports => {
  const spans = reports.map(({ stats: { start, end } }) => {
    return { start: new Date(start), end: new Date(end) }
  })

  const maxSpan = spans.reduce(
    (currentMaxSpan, span) => {
      const start = new Date(
        Math.min(currentMaxSpan.start.getTime(), span.start.getTime())
      )
      const end = new Date(
        Math.max(currentMaxSpan.end.getTime(), span.end.getTime())
      )
      return { start, end }
    }
  )

  return {
    start: maxSpan.start.toISOString(),
    end: maxSpan.end.toISOString(),
  }
}

function pugToHtml(data, output, options) {
  options = resolveOptions(options)
  var reportFile
  switch(options.infos) {
    case 'summary':
      reportFile = '../views/summary_template.pug'
      break
    default:
      reportFile = '../views/full_template.pug'
  }
  let now = new Date()
    let dateOptions = { hourCycle: 'h24', weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    let run_date = now.toLocaleString('en-GB', dateOptions)
    let run_start = new Date(data.stats.start)
    let run_end = new Date(data.stats.end)
    run_start = run_start.toString()
    run_end = run_end.toString()

    let pass_percent = Number((data.stats.passes/data.stats.tests)*100).toFixed(2)
    let fail_percent = Number((data.stats.failures/data.stats.tests)*100).toFixed(2)
    let skip_percent = Number((data.stats.skipped/data.stats.tests)*100).toFixed(2)
    let chart_passed = ''
    let chart_failed = ''
    let chart_skipped = ''
    if (pass_percent != 0 ) { chart_passed = `#2cd860 0, #2cd860 ${pass_percent}%,`}
    if (fail_percent != 0 ) { 
      chart_failed = `#de3f3f 0, #de3f3f ${(Number(parseFloat(pass_percent)) + (Number(parseFloat(fail_percent)))).toFixed(4)}%,`
    }
    if (skip_percent != 0 ) { 
      chart_skipped = `#fdb563 0, #fdb563 ${(Number(parseFloat(pass_percent)) + (Number(parseFloat(fail_percent) + (Number(parseFloat(skip_percent)))))).toFixed(4)}%`
    }
    var opsys = process.platform
    switch (opsys) {
      case 'aix':
        opsys = 'AIX'
        break
      case 'darwin':
        opsys = 'Mac'
        break
      case 'freebsd':
        opsys = 'freebsd'
        break
      case 'linux':
        opsys = 'Linux'
        break
      case 'openbsd':
        opsys = 'openbsd'
        break
      case 'sunos':
        opsys = 'sunos'
        break
      case 'win32':
      case 'win64':
        opsys = "Windows"
        break
      default:
        opsys = 'unknown'
    }
  var fn = pug.compileFile(`${__dirname}/${reportFile}`);
  var html = fn({ 
    lastrun_date: run_date,
    daterun_start: run_start,
    daterun_end: run_end,
    opsys: opsys,
    chart_passed: chart_passed,
    chart_failed: chart_failed,
    chart_skipped: chart_skipped,
    run_suites: data.stats.suites,
    run_numerator: data.stats.tests,
    pass_percent: pass_percent,
    pass_numerator: data.stats.passes,
    fail_percent: fail_percent,
    fail_numerator: data.stats.failures,
    skip_percent: skip_percent,
    skip_numerator: data.stats.skipped,
    results: data.results,
  })
  if (!fse.existsSync(output)){
    mkDirByPathSync(output, {isRelativeToScript: true})
  }
  fse.writeFileSync(`${output}/report.html`, html);
  return html
}

exports.merge = async function merge(options) {
  options = resolveOptions(options)
  const files = collectSourceFiles(options.files)
  const reports = await collectReportFiles(files)
  const suites = collectReportSuites(reports)
  const tests = collectReportTests(suites)

  var reportLevel
  switch (options.infos) {
    case "summary":
      reportLevel = ''
      break
    case "failedOnly":
      var testStatus = reports.filter(function(f){ return f.stats.failures >0 })
      testStatus = collectReportSuites(testStatus)
      if (testStatus) {
        reportLevel = testStatus
      }
      break
    default:
      reportLevel = tests
  }

  let content = []
  content = {
    stats: {
      ...generateStats(suites),
      ...getStateTimeSpan(reports),
    },
    results: reportLevel,
    meta: reports[0].meta,
  }
  let output_dir = `${process.cwd()}/${options.reportDir}`
  if (!fse.existsSync(output_dir)){
    mkDirByPathSync(output_dir, {isRelativeToScript: true})
  }
  let output = `${output_dir}/report.json`
  fse.writeFileSync(output, JSON.stringify(content, null, 4))

 return pugToHtml(content, output_dir, options)
}