#!/usr/bin/env node

const workerpool = require('workerpool');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

const PixlJs = require('./engine');
const { PIXLJS, ERROR, SUCCESS } = require('./common');

(async () => {
  const [_arg1, _arg2, task, configFile] = process.argv;

  if (!configFile) {
    console.error(`${PIXLJS}: ${ERROR('Error')} - No config file was specified.`);
    console.error('');
    console.error('Usage:');
    console.error('$ pixl-js run [config-file]');
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (error) {
    console.error(`${PIXLJS}: ${ERROR('Error')} - Could not parse config file.`, error);
    process.exit(1);
  }

  switch (task) {
    case 'run': {
      const startTimestamp = new Date().getTime();
      const files = glob.sync(config.scenarios || '*.pup.js');
      const maxWorkers = config.maxWorkers || 5;
      const pool = workerpool.pool(path.resolve(__dirname, 'runScenario.js'), { maxWorkers });

      const results = [];
      let completedScenarios = 0;

      const onComplete = () => {
        completedScenarios++;
        if (completedScenarios === files.length) {
          const pixlJs = new PixlJs(config);
          pixlJs.generateReport(results);

          const finishTimestamp = new Date().getTime();
          console.log(`${PIXLJS}: Visual regression execution took: ${finishTimestamp - startTimestamp}ms`);

          const allSteps = results.map((scenario) => scenario.steps).reduce((a, b) => a.concat(b), []);
          const total = allSteps.length;
          const passed = allSteps.filter((step) => !step.error).length;
          const failed = allSteps.filter((step) => step.error).length;

          console.log(`${PIXLJS}: ${SUCCESS('Done')} - ${passed} out of ${total} steps passed (${failed} failed).`);
          process.exit(failed ? 1 : 0);
        }
      };

      console.log(`${PIXLJS}: Matched ${files.length} scenario(s), running visual regression now...`);

      files.forEach((file) => {
        pool.exec('runScenario', [file, startTimestamp, config])
          .then(([result]) => {
            results.push(result);
            pool.terminate();
            onComplete();
          })
          .catch((err) => {
            console.error(`${PIXLJS}: ${ERROR('Error')} - Async worker threw error.`, err);
            onComplete();
          });
      });

      break;
    }

    case 'approve': {
      const pixlJs = new PixlJs(config);
      if (pixlJs.approveLastRun()) {
        console.log(`${PIXLJS}: ${SUCCESS('Done')} - Last visual regression run has been marked as approved.`);
        process.exit(0);
      }

      process.exit(1);
      break;
    }

    default:
      console.log('pixl-js v1.0.10');
      console.log('');
      console.log('Usage:');
      console.log('$ pixl-js [command] [config-file]');
      console.log('');
      console.log('Supported commands:');
      console.log('\trun = Generates a new visual regression run');
      console.log('\tapprove = Approves the last visual regression run');
      process.exit(0);
  }
})();
