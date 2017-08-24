import { LighthouseAssert } from '../';
import defaultExpectations from './fixtures/expectations/default-expectations';
import defaultResults from './fixtures/lighthouse-results/default-results';

describe('Ligthouse assert', () => {
  const lighthouseAssert = new LighthouseAssert();
  lighthouseAssert.assert(defaultResults, defaultExpectations);
});
