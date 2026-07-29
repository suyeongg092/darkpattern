const { extractFormInfo } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/cancel/step1?uid=${uid}${attack ? "&attack=1" : ""}`);
  await page.click('a:has-text("그래도 종료할게요")');
  await page.click('a:has-text("완전히 종료할게요")');

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: () => page.click('button:has-text("혜택 종료하기")'),
  };
}

module.exports = { run };
