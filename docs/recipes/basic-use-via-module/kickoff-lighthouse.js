
const lighthouse = require('lighthouse');
const chromeLauncher = require('lighthouse/chrome-launcher/chrome-launcher');

function launchChromeAndRunLighthouse(url, flags, config = null) {
  return chromeLauncher.launch().then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results)
    );
  });
}

// A full, default run
const flags = {output: 'json'};
launchChromeAndRunLighthouse('https://example.com', flags)
	.then(results => console.log(results));


// Alternatively, customize the configuration:

//   const perfConfig = require('lighthouse/lighthouse-core/config/perf.json');
//   launchChromeAndRunLighthouse('https://example.com', flags, perfConfig)
// 	   .then(results => console.log(results));
