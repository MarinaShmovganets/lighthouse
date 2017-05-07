const yargs = require('yargs');
const pkg = require('../package.json');
const Driver = require('../lighthouse-core/gather/driver.js');

import {GetValidOutputOptions, OutputMode} from './printer';

export function getCliFlags() {
  return yargs.help('help')
      .version(() => pkg.version)
      .showHelpOnFail(false, 'Specify --help for available options')
      .usage('$0 url')
      // List of options
      .group(['verbose', 'quiet'], 'Logging:')
      .describe({
        verbose: 'Displays verbose logging',
        quiet: 'Displays no progress, debug logs or errors'
      })
      .group(
          [
            'save-assets', 'save-artifacts', 'list-all-audits',
            'list-trace-categories', 'additional-trace-categories',
            'config-path', 'chrome-flags', 'perf', 'port', 'max-wait-for-load'
          ],
          'Configuration:')
      .describe({
        'disable-storage-reset':
            'Disable clearing the browser cache and other storage APIs before a run',
        'disable-device-emulation': 'Disable Nexus 5X emulation',
        'disable-cpu-throttling': 'Disable CPU throttling',
        'disable-network-throttling': 'Disable network throttling',
        'save-assets': 'Save the trace contents & screenshots to disk',
        'save-artifacts': 'Save all gathered artifacts to disk',
        'list-all-audits': 'Prints a list of all available audits and exits',
        'list-trace-categories':
            'Prints a list of all required trace categories and exits',
        'additional-trace-categories':
            'Additional categories to capture with the trace (comma-delimited).',
        'config-path': 'The path to the config JSON.',
        'chrome-flags': 'Custom flags to pass to Chrome.',
        'perf': 'Use a performance-test-only configuration',
        'port':
            'The port to use for the debugging protocol. Use 0 for a random port',
        'max-wait-for-load':
            'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
        'skip-autolaunch':
            'Skip autolaunch of Chrome when already running instance is not found',
        'select-chrome':
            'Interactively choose version of Chrome to use when multiple installations are found',
        'interactive': 'Open Lighthouse in interactive mode'
      })
      .group(['output', 'output-path', 'view'], 'Output:')
      .describe({
        'output': `Reporter for the results, supports multiple values`,
        'output-path':
            `The file path to output the results. Use 'stdout' to write to stdout.
      If using JSON output, default is stdout.
      If using HTML output, default is a file in the working directory with a name based on the test URL and date.
      If using multiple outputs, --output-path is ignored.
      Example: --output-path=./lighthouse-results.html`,
        'view': 'Open HTML report in your browser'
      })
      // boolean values
      .boolean([
        'disable-storage-reset', 'disable-device-emulation',
        'disable-cpu-throttling', 'disable-network-throttling', 'save-assets',
        'save-artifacts', 'list-all-audits', 'list-trace-categories', 'perf',
        'view', 'skip-autolaunch', 'select-chrome', 'verbose', 'quiet', 'help',
        'interactive'
      ])
      .choices('output', GetValidOutputOptions())
      // default values
      .default('chrome-flags', '')
      .default('disable-cpu-throttling', false)
      .default('output', GetValidOutputOptions()[OutputMode.html])
      .default('eport', 9222)
      .default('max-wait-for-load', Driver.MAX_WAIT_FOR_FULLY_LOADED)
      .check((argv: {
               listAllAudits?: boolean,
               listTraceCategories?: boolean,
               _: Array<any>
             }) => {
        // Make sure lighthouse has been passed a url, or at least one of
        // --list-all-audits
        // or --list-trace-categories. If not, stop the program and ask for a
        // url
        if (!argv.listAllAudits && !argv.listTraceCategories &&
            argv._.length === 0) {
          throw new Error('Please provide a url');
        }
        return true;
      })
      .argv;
}
