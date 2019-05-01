const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const compareImages = require('resemblejs/compareImages');
const clone = require('clone');

const { REFERENCES_FOLDER_PATH, RUNS_FOLDER_PATH, FAILED_IMAGE, REPORT_FILE } = require('./common');
const render = require('./report');
const cleanFileName = (string) => string.replace(/[^A-z0-9\s]+/g, '').split(' ').join('_').toLowerCase();

class PixlJs {

  constructor(options = {}, initialiseFn = () => void (0), timestamp = new Date().getTime()) {
    this._options = {
      timeout: options.timeout || 10000,
      maxRunsToKeep: options.maxRunsToKeep || 5,
      stabiliseDelay: options.stabiliseDelay || 50,
      misMatchPercentage: options.misMatchPercentage || 0,
      headless: (options.headless != undefined) ? options.headless : true,
      viewports: options.viewports || [{
        name: 'desktop',
        width: 1440,
      }],
      outputDirectory: options.outputDirectory || '.',
      url: options.url,
    };
    this._initialiseFn = initialiseFn;
    this._initialiseTimestamp = timestamp;
  }

  async _setup(browser) {
    // Launch new page
    const page = await browser.newPage();

    // Set default options
    page.setDefaultTimeout(this._options.timeout);
    page.setDefaultNavigationTimeout(this._options.timeout);

    // Navigate to scenario URL
    try {
      await page.goto(this._options.url);
    } catch (error) {
      console.error('Error - Could not navigate to scenario URL.', error);
    }

    // Run initialise function if supplied
    try {
      this._initialiseFn && await this._initialiseFn(page);
    } catch (error) {
      console.error('Error - beforeEach initialise function threw error.', error);
    }

    return page;
  }

  async _stabilisePage(page) {
    // Remove focus from all elements
    await page.evaluate(() => {
      const el = document.querySelector(':focus');
      el && el.blur();
    });

    // Reset mouse position
    await page.mouse.move(0, 0);

    // Wait for any animations/transitions to complete
    await page.waitFor(this._options.stabiliseDelay);
  }

  _createFolders(scenarioFolder, timestamp) {
    // Delete old runs
    try {
      fs.readdirSync(RUNS_FOLDER_PATH(this._options.outputDirectory))
        .sort((a, b) => b - a)
        .slice(this._options.maxRunsToKeep - 1)
        .forEach((run) => fs.removeSync(path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), run)));
    } catch (error) {
    }

    const viewports = this._options.viewports;

    // Create folder structure for each viewport in this scenario
    for (let viewport of viewports) {
      fs.mkdirSync(path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), timestamp, scenarioFolder, viewport.name), { recursive: true });
    }
  }

  async _takeScreenshot(scenarioFolder, timestamp, stepNumber, page) {
    // Wait for any animations/transitions to complete
    await this._stabilisePage(page);

    const viewports = this._options.viewports;

    // Cycle through each viewport and grab a screenshot
    for (let viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: 2 });
      await page.screenshot({
        path: path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), timestamp, scenarioFolder, viewport.name, `step${stepNumber}.png`),
        fullPage: true,
      });
    }
  }

  _failedStep(scenarioFolder, timestamp, stepNumber) {
    const viewports = this._options.viewports;

    // Copy failed image for all viewports in this step
    for (let viewport of viewports) {
      fs.copySync(
        FAILED_IMAGE,
        path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), timestamp, scenarioFolder, viewport.name, `step${stepNumber}_failed.png`),
      );
    }
  }

  async _compareScreenshot(original, target) {
    // Use Resemble.js to calculate difference percentage and produce a diff image
    const data = await compareImages(
      await fs.readFile(original),
      await fs.readFile(target),
    );

    return {
      failed: Number(data.misMatchPercentage) > this._options.misMatchPercentage,
      misMatchPercentage: data.misMatchPercentage,
      getDiff: data.getBuffer,
    };
  }

  async runScenario(scenario) {
    const startTimestamp = new Date().getTime();

    // Launch new browser
    const browser = await puppeteer.launch({ headless: this._options.headless, args: ['--no-sandbox'] });

    // Setup page
    const page = await this._setup(browser);

    // Generate run information
    const scenarioFolder = cleanFileName(scenario.name);
    const timestamp = '' + this._initialiseTimestamp;
    const result = {
      scenario: scenario.name,
      scenarioFolder,
      timestamp,
      steps: [],
    };
    let hasError = false;

    // Create folder structure
    this._createFolders(scenarioFolder, timestamp);

    for (let [index, step] of scenario.steps.entries()) {
      const [description, fn, takeScreenshot = true] = step;
      const stepNumber = index + 1;

      try {
        // If the scenario has been marked as erroneous, then just mark each subsequent step as failed
        if (hasError) {
          result.steps.push({ stepNumber, description, error: 'Skipped due to previous step failure' });
          if (takeScreenshot) {
            this._failedStep(scenarioFolder, timestamp, stepNumber);
          }
          continue;
        }

        // Attempt to run step
        fn && await fn(page, scenario);

        // Grab a screenshot (if requested)
        if (takeScreenshot) {
          await this._takeScreenshot(scenarioFolder, timestamp, stepNumber, page);
        }

        // Populate return object
        result.steps.push({ stepNumber, description, error: null, hasScreenshot: takeScreenshot });
        console.error(`Executed: ${scenario.name} - Step ${stepNumber}: '${description}'.`);
      } catch (error) {
        // Something went wrong, so mark this step as failed
        hasError = true;
        console.error(`Failed: ${scenario.name} - Step ${stepNumber}: '${description}'.`, error);

        result.steps.push({
          stepNumber,
          description,
          error: error instanceof Error ? error.stack : JSON.stringify(error),
          hasScreenshot: takeScreenshot,
        });

        if (takeScreenshot) {
          this._failedStep(scenarioFolder, timestamp, stepNumber);
        }
      }
    }

    await browser.close();

    const finishTimestamp = new Date().getTime();
    result.runTime = `${finishTimestamp - startTimestamp}ms`;

    return result;
  }

  approveLastRun() {
    let lastRun;
    try {
      // Get timestamp of most recent run
      lastRun = fs.readdirSync(RUNS_FOLDER_PATH(this._options.outputDirectory)).sort((a, b) => b - a)[0];
    } catch (error) {
    }

    if (!lastRun) {
      console.error('Error - Could not find any visual regression run to approve.');
      return false;
    }

    // Copy all failed screenshots (now marked as approved) to the references folder
    glob.sync(path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), lastRun) + '/**/*_failed.png')
      .map((file) => file.replace(path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), lastRun), ''))
      .map((file) => file.substring(1))
      .map((file) => ({ from: file, to: file.replace('_failed', '') }))
      .forEach(({ from, to }) => {
        fs.copySync(
          path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), lastRun, from),
          path.resolve(REFERENCES_FOLDER_PATH(this._options.outputDirectory), to),
        );
      });

    return true;
  }

  async compareResults(...reports) {
    const results = clone(reports);
    const viewports = this._options.viewports;

    for (const report of results) {
      const startTimestamp = new Date().getTime();

      // Get all non-failed steps
      const steps = report.steps.filter((step) => !step.error);

      // Iterate through all steps
      for (const step of steps) {
        step.misMatchPercentage = {};

        if (!step.hasScreenshot) {
          continue;
        }

        // Cycle between each viewport
        for (let viewport of viewports) {
          // Get filenames for the reference and test screenshots
          const original = path.resolve(REFERENCES_FOLDER_PATH(this._options.outputDirectory), report.scenarioFolder, viewport.name, `step${step.stepNumber}.png`);
          const target = path.resolve(RUNS_FOLDER_PATH(this._options.outputDirectory), report.timestamp, report.scenarioFolder, viewport.name, `step${step.stepNumber}.png`);

          if (!fs.existsSync(original)) {
            // If the reference screenshot did not exist, this must be the first time this step has been ran, so just mark it as failed
            // It can then be approved using the approve command
            step.error = true;
            console.error(`Failed: [${viewport.name}] ${report.scenario} - Step ${step.stepNumber}: '${step.description}' has no original.`);
            fs.renameSync(target, target.replace('.png', '_failed.png'));
          } else {
            // Otherwise, perform a comparison
            const compare = await this._compareScreenshot(original, target);

            if (compare.failed) {
              // Mark this viewport as failed and write diff image to file
              console.error(`Failed: [${viewport.name}] ${report.scenario} - Step ${step.stepNumber}: '${step.description}' is different by ${compare.misMatchPercentage}%.`);
              fs.renameSync(target, target.replace('.png', '_failed.png'));
              await fs.writeFile(target.replace('.png', '_diff.png'), compare.getDiff());
            }

            // Update return object
            step.error = compare.failed;
            step.misMatchPercentage[viewport.name] = compare.misMatchPercentage;
          }
        }

        const finishTimestamp = new Date().getTime();
        report.comparisonTime = `${finishTimestamp - startTimestamp}ms`;
      }
    }

    return results;
  }

  generateReport(results) {
    fs.removeSync(REPORT_FILE(this._options.outputDirectory));

    const viewports = this._options.viewports;
    const html = render(results, viewports);

    fs.writeFileSync(REPORT_FILE(this._options.outputDirectory), html);
  }

}

module.exports = PixlJs;
