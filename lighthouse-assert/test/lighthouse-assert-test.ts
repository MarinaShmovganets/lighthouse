import * as assert from 'assert';
import { LighthouseAssert } from '../';
import pwaExpectations from './fixtures/expectations/pwa-expectations';
import defaultExpectations from './fixtures/expectations/default-expectations';
import defaultResults from './fixtures/lighthouse-results/default-results';
import pwaResults from './fixtures/lighthouse-results/pwa-results';
import expectedAssertResults from './fixtures/expected-assert-results';

describe('lighthouse-assert', () => {
  it('should build collated results', () => {
    const lighthouseAssert = new LighthouseAssert(defaultResults, defaultExpectations);
    lighthouseAssert.collate();
    const collatedResults = lighthouseAssert.collatedResults;
    assert.deepEqual(collatedResults, expectedAssertResults);
  });

  it('should return false if results less the expected', () => {
    const lighthouseAssert = new LighthouseAssert(defaultResults, defaultExpectations);
    lighthouseAssert.collate();
    assert.ok(!lighthouseAssert.equal());
  });

  it('should fail if pwa results are not the same as expected', () => {
    const lighthouseAssert = new LighthouseAssert(pwaResults, pwaExpectations);
    lighthouseAssert.collate();
    assert.ok(!lighthouseAssert.equal());
  });
});
