# Pixl.js
#### A visual regression based testing tool for web projects using Puppeteer and Chromium.

---

### Installation

1. `npm install --save-dev pixl-js`

### Setup

#### Sample `config.pixl-js.json`

```
{
  "url": "http://www.google.com/",
  "misMatchPercentage": 0,
  "maxRunsToKeep": 5,
  "maxWorkers": 8,
  "viewports": [
    {
      "name": "mobile",
      "width": 320
    },
    {
      "name": "tabletLandscape",
      "width": 1024
    },
    {
      "name": "desktop",
      "width": 1440
    }
  ],
  "scenarios": "./feature.pup.js"
}
```

#### Sample `feature.pup.js` file

```
const enterSearchQuery = (query) => async (page) => {
  await page.type('input[name=q]', query);
};

const performSearch = (query) => async (page) => {
  await Promise.all([
    page.click('input[type=submit'),
    page.waitForNavigation()
  ]);
};

module.exports = {
  name: 'Google ',
  steps: [
    ['It should navigate to Google'],
    ['It should enter some search query', enterSearchQuery('test query')],
    ['It should perform a search', performSearch]
  ]
};
```

### API

For Puppeteer API usage, please refer to: [https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md]

### Usage
- To execute a new visual regression run:
  - `pixl-js run ./config.pixl-js.json`
  
  
- To approve the last visual regression run: 
  - `pixl-js approve`
