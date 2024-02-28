# Lantern Collect Traces

Collects many traces using a local machine and a local mobile device. Must be run on Mac, as it relies on Link Conditioner.

The process to collect these traces requires a Mac device, and a mobile device (Moto G Power). The Mac will hotspot for the mobile device, and the Mac will use Link Conditioner to shape the network traffic.

Each URL is processed one a time: first as unthrottled (but still with mobile UA/viewport emulation) on the Mac, then again right after on an adb-connected mobile device connected to the network via hotspot. Link Conditioner is enabled for the duration of the mobile run. The runs are done back-to-back to avoid potential variance introduced by a site changing its content.

These traces are used to evaluate changes to the Lantern network and CPU emulation.

Historical note: we used to collect the mobile traces from WebPageTest, however their API no longer supports real mobile devices.

## Run

First double check the following:

1. Get the latest stable Chrome, both on the Mac and the mobile device
1. Get the latest OS on the mobile device
1. Close all unnecessary applications on the Mac and the mobile device
1. Ensure both devices are connected to power
1. Install and activate Caffeine on the Mac to prevent sleep
1. On the mobile device, disable Auto App Updates in the Google Play Store
1. On the mobile device, forget any present WiFi connection so that a temporary loss in the hotspot does not accidentally fallback to a fast connection

Next, setup the hotspot:

1. On the Mac, connect to a router with a cable. Do not explicitly disable WiFi, as that needs to be on for the next step
1. Start a hotspot on the Mac ("Internet Sharing") and connect via the mobile device. Now, the Mac will be connected to the Internet via the hardlink, and the mobile device will be connected to the Internet via the Mac over local network WiFi.
1. Set the mobile device close to the mac, but not directly on or too near to it or any router as this will result in a poor connection.

Next, setup the network emulation:

1. Create an entry "LighthouseCustom", and select it
1. Set the download/upload bandwidth to match our "mobile regular 3G" profile: 700 Kbps
1. Set the delay (for both download/upload) to match our "mobile regular 3G" profile: 300 ms - so give 150ms to each
1. Set the DNS delay and packet loss fields to 0
1. Due to the roundabout network emulation and the overhead of a hotspot, we need to finetune these parameters. On the mobile device, go to https://speed.measurementlab.net and run a network test. Modify the inputs in Link Conditioner until the test results match the target parameters. After each change, toggle Link Condition Off/On.
1. 1. I found the uplink throttle to have no impact on the reported upload rate, I assume because the hotspot has too much overhead. So I set the upload bandwidth field to 0 for max.
1. 1. If packet loss is greater than 0%, try moving away from noisy interference (don't be near a router or smart appliance)
1. 1. First finetune the latency: it should be near 300ms
1. 1. Now finetune the down/up link bandwidth
1. 1. For me, I got consisent 0.7 kbps and 0.4 kbps for download/upload (the upload wasn't very close to the target but that's fine for our purposes) for these values: Download- 800kbps, 70ms delay; Upload- max kbps, 70ms delay

Now run the collection script.

```sh
node --max-old-space-size=4096 collect.js
```

Output will be in `dist/collect-lantern-traces`, and zipped at `dist/collect-lantern-traces.zip`.

Rename the zip with the current data (ex: `lantern-traces-2019-12-17.zip`) to Google Drive, and update `VERSION` in `download-traces.sh`.

Finally, upload the zip to the `lh-lantern-data` Cloud storage.

## Verify URLs

```sh
node --input-type=module -e "import urls from './urls.js'; console.log(urls.join('\n'))" |\
  xargs -P 10 -I{} curl -A 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.5672.126 Mobile Safari/537.36 Chrome-Lighthouse' -o /dev/null -s --write-out '%{http_code} {} (if redirect: %{redirect_url})\n' {} |\
  sort
```

Note: some good URLs will 4xx b/c the site blocks such usages of `curl`.


## Historical trace databases


### December 2019

There are 9 runs for each URL in the big zip. The golden zip contains just the median runs (by performance score), along with a dump of the `metrics` collected by Lighthouse. This sampling method was dropped for future trace database updates. The mobile traces here came from a Moto G4 via WPT.

[Download all](https://drive.google.com/open?id=17WsQ3CU0R1072sezXw5Np2knV_NvGAfO) traces (3.2GB zipped, 19GB unzipped).
[Download golden](https://drive.google.com/open?id=1aQp-oqX7jeFq9RFwNik6gkEZ0FLtjlHp) traces (363MB zipped, 2.1GB unzipped).
