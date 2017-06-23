# Lighthouse Configuration

The Lighthouse config object is the primary method of customizing a Lighthouse run to suit your use case. Using a custom config, you can limit the audits to run, add additional loads of the page under special conditions, add your own custom checks, tweak the scoring, and more.

## Usage

You can specify a custom config file when using lighthouse through the CLi or consuming the npm module yourself.

**CLI**
```sh
lighthouse --config-path=path/to/custom-config.js https://example.com
```

**Node**
```js
const lighthouse = require('lighthouse')

const config = {
  passes: [{
    recordTrace: true,
    pauseBeforeTraceEndMs: 5000,
    useThrottling: true,
    gatherers: [],
  }],

  audits: [
    'first-meaningful-paint',
    'speed-index-metric',
    'estimated-input-latency',
    'first-interactive',
    'consistently-interactive',
  ]
}

lighthouse('http://example.com/', {port: 9222}, config)
```

## Properties

### `extends: string|boolean|undefined`

The extends property controls if your configuration should inherit from the default Lighthouse configuration. [Learn more.](#config-extension)

#### Example
```js
{
  extends: 'lighthouse:default',
}
```

### `settings: Object|undefined`

The settings property controls various aspects of running Lighthouse such as CPU/network throttling and audit whitelisting/blacklisting.

#### Example
```js
{
  settings: {
    onlyCategories: ['performance'],
    onlyAudits: ['works-offline'],
  }
}
```

#### Schema
| Name | Type | Description |
| -- | -- | -- |
| onlyCategories | `string[]` | Limits the run to just what's required for the specified categories. Additive with `onlyAudits`. |
| onlyAudits | `string[]` | Limits the run to just what's required for the specified audits. Additive with `onlyCategories`. |
| skipAudits | `string[]` | Prevents the specified audits from being evaluated in the run. Takes priority over `onlyCategories`, not usable in conjuction with `onlyAudits`. |

### `passes: Object[]`

The passes property controls how to load the requested URL and what information to gather about the page while loading. Each entry in the passes array represents one load of the page (e.g. 4 entries in `passes` will load the page 4 times), so be judicious about adding multiple entries here to avoid extending run times.

Along with the basic settings on how long to wait for the page to load and whether to record a trace file you'll find a list of **gatherers** to use. Gatherers can read information from the page to generate artifacts which are later used by audits to provide you with a Lighthouse report. For more information on implementing a custom gatherer and the role they play in building a lighthouse report, refer to the [recipes](https://github.com/GoogleChrome/lighthouse/blob/master/docs/recipes/).


#### Example
```js
{
  passes: [
    {
      passName: 'fastPass',
      recordTrace: true,
      useThrottling: false,
      networkQuietThresholdMs: 0,
      gatherers: ['fast-gatherer'],
    },
    {
      passName: 'slowPass',
      recordTrace: true,
      useThrottling: true,
      gatherers: ['slow-gatherer'],
    }
  ]
}
```

#### Schema
| Name | Type | Description |
| -- | -- | -- |
| passName | `string` | An identifier for the pass used in audits and during config extension. |
| recordTrace | `boolean` | Records a [trace](https://github.com/GoogleChrome/lighthouse/blob/master/docs/architecture.md#understanding-a-trace) of the pass when enabled. |
| useThrottling | `boolean` | Enables throttling of the pass when enabled. |
| pauseAfterLoadMs | `number` | The number of milliseconds to wait after the load event before the pass can continue. |
| networkQuietThresholdMs | `number` | The number of milliseconds since the last network request to wait before the page should be considered to have reached 'network quiet'. |
| pauseAfterNetworkQuietMs | `number` | The number of milliseconds to wait after 'network quiet' before the pass can continue. |
| blockedUrlPatterns | `string[]` | URLs of requests to block while loading the page. Basic wildcard support using `*`.  |
| gatherers | `string[]` | The list of gatherers to run on this pass. |

### `audits: string[]`

The audits property controls which audits to run and include with your Lighthouse report. See [more examples](#more-examples) to see how to add custom audits to your config.

#### Example
```js
{
  audits: [
    'first-meaningful-paint',
    'first-interactive',
    'byte-efficiency/uses-optimized-images',
  ]
}
```


### `categories: Object|undefined`

The categories property controls how to score and organize the audit results in the report. Each category defined in the config will have an entry in the `reportCategories` property of Lighthouse's output. The category output contains the child audit results along with an overall score for the category.

#### Example
```js
{
  categories: {
    performance: {
      name: 'Performance',
      description: 'This category judges your performance',
      audits: [
        {id: 'first-meaningful-paint', weight: 2, group: 'perf-metric'},
        {id: 'first-interactive', weight: 3, group: 'perf-metric'},
        {id: 'consistently-interactive', weight: 5, group: 'perf-metric'},
      ],
    }
  }
}
```

#### Schema
| Name | Type | Description |
| -- | -- | -- |
| name | `string` | The display name of the category. |
| description | `string` | The displayed description of the category. |
| audits | `Object[]` | The audits to include in the category. |
| audits[$i].id | `string` | The ID of the audit to include. |
| audits[$i].weight | `number` | The weight of the audit in the scoring of the category. |
| audits[$i].group | `string` (optional) | The ID of the [display group](#groups-objectundefined) of the audit. |

### `groups: Object|undefined`

The groups property controls how to visually group audits within a category. For example, this is what enables the grouped rendering of metrics and accessibility audits in the report.

**Note: logic to display audit groups is required in the report renderer. Adding arbitrary groups without additional rendering logic may not perform as expected.**

#### Example
```js
{
  categories: {
    performance: {
      audits: [
        {id: 'my-performance-metric', weight: 2, group: 'perf-metric'},
      ],
    }
  },
  groups: {
    'perf-metric': {
      title: 'Metrics',
      description: 'These metrics encapsulate your app\'s performance across a number of dimensions.'
    },
  }
}
```

## Config Extension

The stock Lighthouse configurations can be extended if you only need to make small tweaks, such as adding an audit or skipping an audit, but wish to still run most of what Lighthouse offers. When adding the `extends: 'lighthouse:default'` property to your config, the default passes, audits, groups, and categories will be automatically included, allowing you modify settings or add additional audits to a pass. See [more examples below](#more-examples) to see different types of extension in action.

**Config extension is the recommended way to run custom Lighthouse**. If there's a use case that extension doesn't currently solve, we'd love to [hear from you](https://github.com/GoogleChrome/lighthouse/issues/new)!

## More Examples

The best examples are the ones Lighthouse uses itself! There are several reference configuration files that are maintained as part of Lighthouse.

* [lighthouse-core/config/default.js](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default.js)
* [lighthouse-core/config/perf.json](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/perf.json)
* [lighthouse-core/config/plots-config.js](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/plots-config.js)
* [docs/recipes/custom-audit/custom-config.js](https://github.com/GoogleChrome/lighthouse/blob/master/docs/recipes/custom-audit/custom-config.js)

