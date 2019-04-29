# Pixl.js
#### A visual regression based testing tool for web projects using Puppeteer and Chromium.

---

### Installation

- If you would like to import this library and incorporate it into your dev workflow, then run:
  - `npm install --save-dev pixl-js`
  
  
- Otherwise you can install Pixl.js globally and use it as a CLI tool as follows:
  - `npm install --global pixl-js`

### Demo

An example feature is available in the `demo/` folder.

#### Sample `config.pixl-js.json`

```
{
  "url": "https://www.gmail.com/",
  "misMatchPercentage": 0,
  "maxRunsToKeep": 5,
  "maxWorkers": 8,
  "viewports": [
    {
      "name": "desktop",
      "width": 1440
    },
    {
      "name": "mobile",
      "width": 480
    }
  ],
  "scenarios": "./feature.pup.js"
}
```

#### Sample `feature.pup.js` file

```
const enterEmail = (query) => async (page) => {
  await page.type('input[type=email]', query);
};

const pressNext = async (page) => {
  await page.click('#identifierNext');
  await page.waitForResponse((response) => response.url().startsWith('https://accounts.google.com'));
};

module.exports = {
  name: 'Gmail login',
  steps: [
    ['It should navigate to Gmail'],
    ['It should enter an email address', enterEmail('test@email.com')],
    ['It should press Next', pressNext],
  ],
};
```

### API

For Puppeteer API usage, please refer to: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md

### Usage
- To execute a new visual regression run:
  - `pixl-js run ./config.pixl-js.json`
  
  
- To approve the last visual regression run: 
  - `pixl-js approve`
