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
