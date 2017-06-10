# Chrome Launcher

Launch chrome with ease from node.

### Installing

```
yarn add chrome-launcher
```

or

```
npm install chrome-launcher
```


## API

#### Launch options

```js
chromeLauncher.launch({
  // optional staring url string
  startingUrl: string;
  // optional array of (string) flags to pass to chrome, for example ['--headless', '--disable-gpu']
  // See all flags here: http://peter.sh/experiments/chromium-command-line-switches/
  chromeFlags: Array<string>;
  // optional explicit remote debugging port number to use, otherwise an open port is autoselected for you.
  port: number;
  // optional, handle cleaning up chrome when node process gets killed via SIGINT
  handleSIGINT: boolean;
  // optional, explicit path to chrome to launch
  chromePath: string;
  // optional, user dir path to reuse
  userDataDir: string;
});
```

#### Launched chrome interface

```js
{
  // process id of chrome.
  pid: number;
  // the remote debuging port exposed by the launched chrome.
  port: number;
  // a function to kill and cleanup chrome.
  kill: () => Promise<{}>;
}
```


## Examples

#### Launching chrome:

```js
const chromeLauncher = require('chrome-launcher');

chromeLauncher.launch({
  startingUrl: 'https://google.com'
}).then(info => {
  console.log(`Chrome debugging port running on ${info.port}`);
});
```


#### Launching headless chrome:

```js
const chromeLauncher = require('chrome-launcher');

chromeLauncher.launch({
  startingUrl: 'https://google.com',
  chromeFlags: ['--headless', '--disable-gpu']
}).then(info => {
  console.log(`Chrome debugging port running on ${info.port}`);
});
```
