const { extractFormInfo, pointerTo, settle } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/cancel/hub?uid=${uid}${attack ? "&attack=1" : ""}`);
  await settle(page);

  await pointerTo(page, 'a:has-text("멤버십 설정")');
  await page.click('a:has-text("멤버십 설정")');
  await settle(page);

  await pointerTo(page, 'input[value="full_cancel"]');
  await page.check('input[value="full_cancel"]');
  await pointerTo(page, 'button:has-text("계속하기")');
  await page.click('button:has-text("계속하기")');
  await settle(page);

  await pointerTo(page, 'input[name="code"]');
  await page.fill('input[name="code"]', "123456");
  await pointerTo(page, 'button:has-text("확인")');
  await page.click('button:has-text("확인")');
  await settle(page);

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: async () => {
      await pointerTo(page, 'button:has-text("완전 해지하기")');
      await page.click('button:has-text("완전 해지하기")');
    },
  };
}

module.exports = { run };
