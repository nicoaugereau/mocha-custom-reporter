# mocha-custom-reporter

Merge several [Mochawesome](https://github.com/adamgruber/mochawesome) JSON reports and generate html report like [Mochawesome-report-generator](https://github.com/adamgruber/mochawesome-report-generator) but little bit different.

## Installation

via `npm`:

```
$ npm install mocha-custom-reporter --save-dev
```

## Writing tests

In order to obtain the correct number of scenarios, it is best to write the tests like this: 

```
describe('My scenario. Use describe or context', () => {
  it('My first test, or step', () => {
  })
  it('My second test', () => {
  })
})
```
You can write 1 scenario per file, or several scenarios per file.


## Examples

### JavaScript API

```javascript
const { merge } = require('mocha-custom-reporter')

// See Params section below
const options = {
  files: [
    './report/*.json',

    // you can specify more files or globs if necessary:
    './mochawesome-report/*.json',
  ],
}

merge(options)
```

### CLI

```
$ npx mocha-custom-reporter -f ./report/*.json -r report/mocha-custom-reporter -i failedOnly
```

You can specify as many paths as you wish:

```
$ npx mocha-custom-reporter -f ./report/*.json ./mochawesome-report/*.json r report/mocha-custom-reporter
```

### Params

- `files`: list of source report file paths. Can include glob patterns.
- Aliases: `-f | --files` or first positional argument
- Defaults to `["./mochawesome-report/mochawesome*.json"]`.
#
- `reportDir`: a file path to the bundled results. Should be a `json` file 
- Aliases: `-r | --reportDir`
- Defaults to `stdout`.
#
- `infos`: `summary`, `failedOny` (with summary), or full report.
- Aliases: `-i| --infos`
- Defaults to full report`.


## [Cypress](https://github.com/cypress-io/cypress)

The motivation to create this custom report is tu use [mochawesome](https://github.com/adamgruber/mochawesome) together with [Cypress](https://github.com/cypress-io/cypress) and to bypass some technical constraints.

Since the version `3.0.0`, Cypress runs every spec separately, which leads to generating multiple mochawesome reports, one for each spec. `mochawesome-merge` can be used to merge these reports and then generate one HTML report for all your cypress tests.

First, configure `cypress.json`:

```jsonc
{
  // use mochawesome reporter as usually
  "reporter": "mocha-custom-reporter",
  "reporterOptions": {
    // path to generate report.json and report.html
    "reportDir": "mocha/mochareports/",
    // generate summary report only
    "infos": "summary"
  }
}
```

Then, write your custom script to run `cypress` together with `mochawesome-merge`:

```javascript
const cypress = require('cypress')
const { merge } = require('mocha-custom-reporter')

/* 
You can add cypress.json file to constant :
const { reporterOptions } = require('./cypress.json')

or add reporterOptions constant :
const reporterOptions = {
  "reportDir": "mocha/mochareports/",
  "infos": "summary"
}
*/
cypress.run().then(
  () => {
    generateReport(reporterOptions)
  },
  error => {
    generateReport()
    console.error(error)
    process.exit(1)
  }
)

function generateReport(reporterOptions) {
  return merge(reporterOptions)
}
```
