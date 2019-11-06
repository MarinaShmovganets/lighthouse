# DevTools Throttling Deprecation Notice

Starting with Chrome 80, Lighthouse within Chrome DevTools is deprecating the throttling configuration. To wit:

1. `Simulated Throttling` will become the only option
1. For awhile, you may also use `Applied Throttling` by unchecking the `Simulated Throttling` checkbox
1. `No Throttling` is removed

We are keeping `Applied Throttling` for now because the `View Trace` button in the report does not show a sensible trace for `Simulated Throttling`. We plan to improve the story around viewing the simulated trace in the future. At that point the `Applied Throttling` option will be removed too.
