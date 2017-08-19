export default [{
  initialUrl: 'http://localhost:10200/tricky-ttci.html',
  url: 'http://localhost:10200/tricky-ttci.html',
  audits: {
    'first-contentful-paint': {
      score: 100,
      rawValue: '>3000',
    },
    'first-meaningful-paint': {
      score: '60',
      rawValue: '>3000',
    },
    'first-interactive': {
      score: '100',
      rawValue: '>9000',
    },
    'consistently-interactive': {
      score: '<80',
      rawValue: '>9000',
    },
  }
}];
