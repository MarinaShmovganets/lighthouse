module.exports = {
    extends: 'lighthouse:default',
    settings: {
      Audits: [
        'first-contentful-paint',
        'speed-index',
        'interactive',
       'largest-contentful-paint',
       'first-input-delay',
       'cumulative-layout-shift',
       'total-blocking-time',
       'best-practices'

      ],
      
    },
  };