module.exports = {
  meta: {
    id: 'iframe-elements',
    title: 'IFrame Elements',
    description: 'Audit to force the inclusion of IFrameElements artifact',
    requiredArtifacts: ['IFrameElements'],
  },
  audit: () => ({score: 1}),
};
