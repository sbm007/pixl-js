const workerpool = require('workerpool');
const path = require('path');

const VisualKit = require('./engine');

async function runScenario(scenarioFile, timestamp, config) {
  const initialiseFn = config.beforeEach ? require(path.resolve(config.beforeEach)) : undefined;
  const scenario = require(path.resolve(scenarioFile));
  const visualKit = new VisualKit(config, initialiseFn, timestamp);
  const report = await visualKit.runScenario(scenario);
  return await visualKit.compareResults(report);
}

workerpool.worker({ runScenario });
