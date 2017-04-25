# Lighthouse Metrics Analysis

Online at https://googlechrome.github.io/lighthouse/plots/

For context and roadmap, please see issue:
https://github.com/GoogleChrome/lighthouse/issues/1924

## Workflow

### Setup

You need to build lighthouse first.

### Commands

```
# View all commands
$ cd plots
$ npm run

# Run lighthouse to collect metrics data
$ npm run measure

# Analyze the data to generate a summary file (i.e. out/generatedResults.js)
$ npm run analyze

# View visualization

# Sites by metric
# Open index.html in browser

# Metrics by site
# Open plot-per-site.html in browser
```

