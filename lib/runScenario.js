const workerpool = require('workerpool');
const path = require('path');

const PixlJs = require('./engine');

async function runScenario(scenarioFile, timestamp, config) {
  const initialiseFn = config.beforeEach ? require(path.resolve(config.beforeEach)) : undefined;
  const scenario = require(path.resolve(scenarioFile));
  const pixlJs = new PixlJs(config, initialiseFn, timestamp);
  const report = await pixlJs.runScenario(scenario);
  return await pixlJs.compareResults(report);
}

workerpool.worker({ runScenario });
