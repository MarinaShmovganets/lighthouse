const fs = require('fs');
const path = require('path');

const lhRoot = path.join(__dirname, '../../..');
const pubAdsRoot = path.relative(
    lhRoot, path.dirname(require.resolve('lighthouse-plugin-publisher-ads'))).replace(/\\/g, '/');

const distLocalesPath = path.join(lhRoot, 'dist', 'dt-locales');

fs.mkdirSync(distLocalesPath, {recursive: true});


const pubAdsLocales = require('lighthouse-plugin-publisher-ads').locales;

const lhLocalePaths = fs.readdirSync(__dirname + '/../../lib/i18n/locales/')
    .map(f => require.resolve(`../../lib/i18n/locales/${f}`));

lhLocalePaths.forEach(localePath => {
    if(localePath.endsWith('.ctc.json')) return;
    const locale = path.basename(localePath, '.json');
    const coreMessages = require(localePath);
    const pubAdsMessages = pubAdsLocales && pubAdsLocales[locale];
    if (pubAdsMessages) {
        for (const [key, message] of Object.entries(pubAdsMessages)) {
            const [filename, varName] = key.split(' | ');
            coreMessages[`${path.join(pubAdsRoot, filename)} | ${varName}`] = message;
        }
    }
    fs.writeFileSync(path.join(distLocalesPath, `${locale}.json`), JSON.stringify(coreMessages));
});