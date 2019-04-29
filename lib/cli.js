const workerpool = require('workerpool');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

const VisualKit = require('./engine');

(async () => {
  const [_arg1, _arg2, task, configFile] = process.argv;

  switch (task) {
    case 'run': {
      if (!configFile) {
        console.error('Error - No config file was specified.');
        console.error('');
        console.error('Usage:');
        console.error('$ pixl-js run [config-file]');
        process.exit(1);
      }

      let config;
      try {
        config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      } catch (error) {
        console.error('Error - Could not parse config file.', error);
        process.exit(1);
      }

      const startTimestamp = new Date().getTime();
      const files = glob.sync(config.scenarios || '*.pup.js');
      const maxWorkers = config.maxWorkers || 5;
      const pool = workerpool.pool(path.resolve(__dirname, 'runScenario.js'), { maxWorkers });

      const results = [];
      let completedScenarios = 0;

      const onComplete = () => {
        completedScenarios++;
        if (completedScenarios === files.length) {
          const visualKit = new VisualKit(config);
          visualKit.generateReport(results);

          const finishTimestamp = new Date().getTime();
          console.log(`Visual regression execution took: ${finishTimestamp - startTimestamp}ms`);

          const allSteps = results.map((scenario) => scenario.steps).reduce((a, b) => a.concat(b), []);
          const total = allSteps.length;
          const passed = allSteps.filter((step) => !step.error).length;
          const failed = allSteps.filter((step) => step.error).length;

          console.log(`Done: ${passed} out of ${total} steps passed (${failed} failed).`);
          process.exit(failed ? 1 : 0);
        }
      };

      console.log(`Matched ${files.length} scenario(s), running visual regression now...`);

      files.forEach((file) => {
        pool.exec('runScenario', [file, startTimestamp, config])
          .then(([result]) => {
            results.push(result);
            pool.terminate();
            onComplete();
          })
          .catch((err) => {
            console.error('Error - Async worker threw error.', err);
            process.exit(1);
          });
      });

      break;
    }

    case 'approve': {
      const visualKit = new VisualKit();
      visualKit.approveLastRun();
      console.log(`Last visual regression run has been marked as approved.`);
      process.exit(0);
      break;
    }

    default:
      console.log('pixl-js v1.0.0');
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