# Basic Custom Audit Recipe

> **Tip**: see [Lighthouse Architecture](../../../docs/architecture.md) more information
on terminology and architecture.

## What this example does

This example shows how to write a custom Lighthouse audit for a hypothetical site
which measures the time from navigation start to when the page has initialized.
The page is considered fully initialized when the main search box ("hero element")
is ready to be used. The page saves that time in a global variable called `window.myLoadMetrics.searchableTime`.

## The Audit, Gatherer, and Config

[searchable-gatherer.js](searchable-gatherer.js) - a [Gatherer](https://github.com/GoogleChrome/lighthouse/blob/master/docs/architecture.md#components--terminology) that collects `window.myLoadMetrics.searchableTime`
from the context of the page.

[searchable-audit.js](searchable-audit.js) - an [Audit](https://github.com/GoogleChrome/lighthouse/blob/master/docs/architecture.md#components--terminology) that tests whether or not `window.myLoadMetrics.searchableTime`
stays below a 4000ms. In other words, Lighthouse will consider the audit "passing"
in the report if the search box initializes within 4s.

[custom-config.js](custom-config.js) - this file tells Lighthouse where to
find the gatherer and audit files, when to run them, and how to incorporate their
output into the Lighthouse report. In this example, we have extended [Lighthouse's
default configuration](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default.js). If you're extending Lighthouse's default, passes with the same name are merged together, all other arrays will be concatenated, and primitive values will override the defaults.

## Run the configuration

Lastly, tell Lighthouse to run your audit(s) by passing the `--config-path` flag
with your configuration:

```sh
lighthouse --config-path=custom-config.js https://example.com
```
