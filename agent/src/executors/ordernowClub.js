const { extractFormInfo } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/manage?uid=${uid}${attack ? "&attack=1" : ""}`);
  await page.click('a:has-text("멤버십 해지")');
  await page.click('a:has-text("혜택 필요 없어요")');
  await page.check('input[value="unused"]');
  await page.click('button:has-text("다음")');

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: () => page.click('button:has-text("해지 확정하기")'),
  };
}

module.exports = { run };
