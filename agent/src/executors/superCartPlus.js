const { extractFormInfo } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/cancel?uid=${uid}${attack ? "&attack=1" : ""}`);
  await page.check('input[value="full_cancel"]');
  await page.click('button:has-text("계속하기")');
  await page.fill('input[name="code"]', "123456");
  await page.click('button:has-text("확인")');

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: () => page.click('button:has-text("완전 해지하기")'),
  };
}

module.exports = { run };
