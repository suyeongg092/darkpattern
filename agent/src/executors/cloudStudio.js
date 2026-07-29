const { extractFormInfo } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/cancel?uid=${uid}${attack ? "&attack=1" : ""}`);

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: () => page.click('button:has-text("구독 해지하기")'),
  };
}

module.exports = { run };
