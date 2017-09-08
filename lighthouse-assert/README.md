# Lighthouse assert

Compare Lighthouse results with expectations

## Installing

```
yarn add lighthouse-assert

# or with npm:
npm install lighthouse-assert

```

## API

### Methods

`assert(results, expectations)`

will pass in case results greater than expected

**results[Array]**

Array of Lighthouse results. See [here](/test/fixtures/lighthouse-results/pwa-results.ts) format example.

**expectations[Array]**

Array of expected results. See [here](/test/fixtures/expectations/pwa-expectations.ts) format example.

> If assert failed then error message will be shown. For building your own error error representation use your own reporter.

### Reporters

Lighthouse-assert has default [reporter](/reporter/reporter.ts).
We provide API for building your own reporter.
You just need to implement [IReporter](/reporter/reporter.ts) interface and pass it into constructor.

Example
```javascript
const LighthouseAssert = require('lighthouse-assert');
const CustomReporter = require('./custom-lighthouse-reporter');

const lighthouseAssert = new LighthouseAssert(CustomReporter);
lighthouseAssert.assert(results, expectations);
```
