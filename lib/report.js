const { REFERENCES_FOLDER, RUNS_FOLDER } = require('./common');

const reportScenario = (scenario, viewports) => {
  const total = scenario.steps.length;
  const passed = scenario.steps.filter((step) => !step.error).length;
  const failed = scenario.steps.filter((step) => step.error).length;

  return `
<h1>Scenario: ${scenario.scenario}</h1>
<p>Ran ${total} steps of which <span style="color: green">${passed}</span> passed and <span style="color: red">${failed}</span> failed.</p>
<p>It took <strong>${scenario.runTime}</strong> to run the scenario and <strong>${scenario.comparisonTime}</strong> to perform a comparison.</p>
<hr/>
${scenario.steps.map((step) => reportStep(step, scenario, viewports)).join('')}
`;
};

const reportStep = (step, scenario, viewports) => {
  return `
<h2 style="color: ${step.error ? 'red' : 'green'}">${step.stepNumber}. ${step.description}</h2>
${viewports.map((viewport) => `
  Viewport: <strong>${viewport.name}</strong>
  <br/>
  ${step.misMatchPercentage ? `Difference: <strong>${step.misMatchPercentage[viewport.name]}%</strong><br/>` : ''}
  ${typeof step.error === 'string' ? `Error: <pre>${step.error}</pre><br/>` : ''}
  <br/>
  <img border="1" src="./${REFERENCES_FOLDER}/${scenario.scenarioFolder}/${viewport.name}/step${step.stepNumber}.png" width="300" height="300" style="object-fit: contain" />
  <img border="1" src="./${RUNS_FOLDER}/${scenario.timestamp}/${scenario.scenarioFolder}/${viewport.name}/step${step.stepNumber}${step.error ? '_failed' : ''}.png" width="300" height="300" style="object-fit: contain" />
  ${step.misMatchPercentage && step.error ? `<img border="1" src="./${RUNS_FOLDER}/${scenario.timestamp}/${scenario.scenarioFolder}/${viewport.name}/step${step.stepNumber}_diff.png" width="300" height="300" style="object-fit: contain" />` : ''}
  <br/>
  <br/>
  <hr/>
`).join('')}
`;
};

const render = (results, viewports) => {
  return `
<html>
<head>
<title>Pixl.js Report</title>
</head>

<body style="{ font-family: Arial }">
  ${results.map((scenario) => reportScenario(scenario, viewports)).join('')}
</body>
</html>
`;
};

module.exports = render;
