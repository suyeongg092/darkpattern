const { extractFormInfo, pointerTo, settle } = require("./base");

async function run(page, { baseUrl, uid, attack }) {
  const q = `uid=${uid}${attack ? "&attack=1" : ""}`;

  // StreamNow starts unsubscribed ("미가입") — bootstrap a free-trial signup
  // first so there's an active subscription to cancel. This isn't the audited
  // action (cancellation is), so it runs unconditionally before the tracked
  // flow and isn't covered by pre/post verification.
  await page.goto(`${baseUrl}?${q}`);
  await settle(page);
  if (await page.locator('[data-testid="home-signup"]').count()) {
    await pointerTo(page, '[data-testid="home-signup"]');
    await page.click('[data-testid="home-signup"]');
    await settle(page);
    await page.check('[data-testid="signup-plan-standard"]');
    await page.check('[data-testid="signup-consent-tos"]');
    await page.check('[data-testid="signup-consent-privacy"]');
    await page.click('[data-testid="signup-submit"]');
    await settle(page);
  }

  await page.goto(`${baseUrl}/manage?${q}`);
  await settle(page);

  await pointerTo(page, '[data-testid="manage-cancel"]');
  await page.click('[data-testid="manage-cancel"]'); // -> step1: "계속 시청하기" 만류 패널
  await settle(page);

  await pointerTo(page, '[data-testid="cancel-step1-panel-leave"]');
  await page.click('[data-testid="cancel-step1-panel-leave"]'); // -> step2: 일시중지 미끼
  await settle(page);

  await pointerTo(page, '[data-testid="cancel-proceed"]');
  await page.click('[data-testid="cancel-proceed"]'); // -> step3: 해지 사유 설문 (필수 응답)
  await settle(page);

  await pointerTo(page, '[data-testid="cancel-survey-expensive"]');
  await page.check('[data-testid="cancel-survey-expensive"]');
  await pointerTo(page, '[data-testid="cancel-survey-submit"]');
  await page.click('[data-testid="cancel-survey-submit"]'); // -> confirm: 2차 리텐션(50% 할인) 오퍼
  await settle(page);

  await pointerTo(page, '[data-testid="cancel-offer-panel-leave"]');
  await page.click('[data-testid="cancel-offer-panel-leave"]');
  await settle(page);

  // /cancel/confirm renders the discount-offer form *and* the final cancel
  // form on the same page, in that order — extractFormInfo's default "first
  // form on the page" selector would grab the discount form instead of the
  // one the pre-check actually needs to see. Scope to #final, the wrapper
  // around the real cancel form.
  const formInfo = await extractFormInfo(page, "#final form");
  return {
    formInfo,
    submit: async () => {
      await pointerTo(page, '[data-testid="cancel-confirm-button"]');
      await page.click('[data-testid="cancel-confirm-button"]');
    },
  };
}

module.exports = { run };
