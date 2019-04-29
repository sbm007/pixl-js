const enterEmail = (query) => async (page) => {
  await page.type('input[type=email]', query);
};

const pressNext = async (page) => {
  const emailInput = await page.$('input[type=email]');
  await emailInput.press('Enter');
  await page.waitForNavigation();
};

module.exports = {
  name: 'Gmail login',
  steps: [
    ['It should navigate to Gmail'],
    ['It should enter an email address', enterEmail('test@email.com')],
    ['It should press Next', pressNext],
  ],
};
