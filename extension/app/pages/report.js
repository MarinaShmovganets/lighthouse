var NO_SCORE_PROVIDED = '-1';

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/`/g, '&#96;');
}

function createResultsHTML(results) {
  let resultsHTML = '';

  results.forEach(item => {
    const score = (item.score.overall * 100).toFixed(0);
    const groupHasErrors = (score < 100);
    const groupClass = 'group ' +
        (groupHasErrors ? 'errors expanded' : 'no-errors collapsed');

    // Skip any tests that didn't run.
    if (score === NO_SCORE_PROVIDED) {
      return;
    }

    let groupHTML = '';
    item.score.subItems.forEach(subitem => {
      const debugString = subitem.debugString ? ` title="${escapeHTML(subitem.debugString)}"` : '';

      const status = subitem.value ?
          `<span class="pass" ${debugString}>Pass</span>` :
          `<span class="fail" ${debugString}>Fail</span>`;
      const rawValue = subitem.rawValue ? `(${escapeHTML(subitem.rawValue)})` : '';
      groupHTML += `<li>${escapeHTML(subitem.description)}: ${status} ${rawValue}</li>`;
    });

    resultsHTML +=
      `<li class="${groupClass}">
        <span class="group-name">${escapeHTML(item.name)}</span>
        <span class="group-score">(${score}%)</span>
        <ul>
          ${groupHTML}
        </ul>
      </li>`;
  });

  return resultsHTML;
}

chrome.runtime.onMessage.addListener(
function(msg, sender, _) {
  document.querySelector('.content').innerHTML = createResultsHTML(msg);
  console.log(msg);
});
