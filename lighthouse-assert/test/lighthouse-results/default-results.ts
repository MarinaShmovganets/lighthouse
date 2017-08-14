export default {
  initialUrl: 'http://localhost:10200/tricky-ttci.html',
  url: 'http://localhost:10200/tricky-ttci.html',
  audits: {
    'first-interactive': {
      score: '<75',
      rawValue: '>9000',
    },
    'consistently-interactive': {
      score: '<75',
      rawValue: '>9000',
    },
  }
};
