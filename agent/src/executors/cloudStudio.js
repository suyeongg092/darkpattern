const { extractFormInfo, pointerTo, settle } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/cancel/hub?uid=${uid}${attack ? "&attack=1" : ""}`);
  await settle(page);

  await pointerTo(page, 'a:has-text("그래도 해지할게요")');
  await page.click('a:has-text("그래도 해지할게요")');
  await settle(page);

  await pointerTo(page, 'a:has-text("완전히 해지할게요")');
  await page.click('a:has-text("완전히 해지할게요")');
  await settle(page);

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: async () => {
      await pointerTo(page, 'button:has-text("구독 해지하기")');
      await page.click('button:has-text("구독 해지하기")');
    },
  };
}

module.exports = { run };
