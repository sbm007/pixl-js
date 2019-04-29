const path = require('path');

const REFERENCES_FOLDER = 'vr_references';
const REFERENCES_FOLDER_PATH = (outputDirectory) => path.resolve(process.cwd(), outputDirectory, REFERENCES_FOLDER);

const RUNS_FOLDER = 'vr_runs';
const RUNS_FOLDER_PATH = (outputDirectory) => path.resolve(process.cwd(), outputDirectory, RUNS_FOLDER);

const FAILED_IMAGE = path.resolve(__dirname, 'failed.png');
const REPORT_FILE = (outputDirectory) => path.resolve(process.cwd(), outputDirectory, 'vr_report.html');

module.exports = {
  REFERENCES_FOLDER,
  REFERENCES_FOLDER_PATH,
  RUNS_FOLDER,
  RUNS_FOLDER_PATH,
  FAILED_IMAGE,
  REPORT_FILE,
};
