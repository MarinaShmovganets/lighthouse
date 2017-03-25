class ReportRenderer {
  /**
   * @param {!Object} report
   */
  constructor(report) {
    this._report = report;
  }

  /**
   * @param {!Element} element
   */
  render(element) {
    const pre = document.createElement('pre');
    pre.innerText = JSON.stringify(this._report, null, 2);
    element.appendChild(pre);
  }
}

const renderer = new ReportRenderer(window.__LIGHTHOUSE_JSON__);
renderer.render(document.body);
