const { extractFormInfo } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/manage?uid=${uid}${attack ? "&attack=1" : ""}`);
  await page.click('a:has-text("멤버십 해지")'); // -> hub: coupons + "혜택 유지하기" trap
  await page.click('a:has-text("해지하기")'); // -> value-reminder: sunk-cost + comparison bar
  await page.click('a:has-text("그래도 해지할게요")'); // -> survey
  await page.check('input[value="price"]');
  await page.click('button:has-text("다음")');

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: () => page.click('button:has-text("해지 확정하기")'),
  };
}

module.exports = { run };
