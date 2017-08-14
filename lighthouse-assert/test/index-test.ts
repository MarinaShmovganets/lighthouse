import * as assert from 'assert';
import { LighthouseAssert } from '../';
import pwaExpectations from './expectations/pwa-expectations';
import defaultExpectations from './expectations/default-expectations';
import defaultResults from './lighthouse-results/default-results';
import pwaResults from './lighthouse-results/pwa-results';
import expectedAssertResults from './expected-assert-reslts';

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

  it('should return true if results equal or more then the expected', () => {
    const lighthouseAssert = new LighthouseAssert(pwaResults, pwaExpectations);
    lighthouseAssert.collate();
    assert.ok(lighthouseAssert.equal());
  });
});
