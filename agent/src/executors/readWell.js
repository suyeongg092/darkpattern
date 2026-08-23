const { extractFormInfo, pointerTo, settle } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  await page.goto(`${baseUrl}/manage?uid=${uid}${attack ? "&attack=1" : ""}`);
  await settle(page);

  await pointerTo(page, '[data-testid="manage-cancel"]');
  await page.click('[data-testid="manage-cancel"]'); // -> /cancel: 해지 방식 선택 화면
  await settle(page);

  // 기본 선택 없는 radio — 정기결제 해지(기간 만료까지 이용 후 종료)를 고른다.
  await pointerTo(page, '[data-testid="cancel-period-end"]');
  await page.check('[data-testid="cancel-period-end"]');

  const formInfo = await extractFormInfo(page);
  return {
    formInfo,
    submit: async () => {
      await pointerTo(page, '[data-testid="cancel-submit"]');
      await page.click('[data-testid="cancel-submit"]');
    },
  };
}

module.exports = { run };
