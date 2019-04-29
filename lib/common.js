const path = require('path');

const REFERENCES_FOLDER = 'vr_references';
const REFERENCES_FOLDER_PATH = path.resolve(process.cwd(), REFERENCES_FOLDER);

const RUNS_FOLDER = 'vr_runs';
const RUNS_FOLDER_PATH = path.resolve(process.cwd(), RUNS_FOLDER);

const FAILED_IMAGE = path.resolve(__dirname, 'failed.png');
const REPORT_FILE = path.resolve(process.cwd(), 'vr_report.html');

module.exports = {
  REFERENCES_FOLDER,
  REFERENCES_FOLDER_PATH,
  RUNS_FOLDER,
  RUNS_FOLDER_PATH,
  FAILED_IMAGE,
  REPORT_FILE,
};
