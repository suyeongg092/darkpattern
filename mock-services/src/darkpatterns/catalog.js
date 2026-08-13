// Dark-pattern type catalog — the single source of truth for what a detector
// is allowed to report. IDs here are what ground-truth labels and detector
// output are matched on, so they must never be renamed casually (CONTRACT.md).
//
// Types 1-13 are the taxonomy published by the Korea Fair Trade Commission
// (공정거래위원회, 2025-09-30 보도참고자료 붙임1). `law` is the 전자상거래법
// article the type maps to; `newly_regulated` marks the six types the amended
// act (in force 2025-02-14) added explicit provisions for — those are the ones
// worth leading with in the presentation, since detecting them has direct
// regulatory meaning rather than being a generic UX complaint.
//
// Types beyond 13 have no Korean statutory provision of their own; they are
// well-established HCI dark-pattern categories (Gray et al. / Mathur et al.,
// and the brunch.co.kr/@dayjj/2 case roundup) that we still label because they
// co-occur with the statutory ones and make the evaluation set realistic.

const PATTERNS = {
  // ── 전자상거래법에서 신설 규율하는 6개 유형 ──────────────────────────
  hidden_renewal: {
    ko: "숨은갱신",
    en: "Hidden renewal",
    law: "전자상거래법 §13⑥",
    newly_regulated: true,
    severity: "high",
    desc: "무료에서 유료 전환, 결제대금 증액 시 소비자에게 별도의 동의나 고지 없이 자동결제",
  },
  drip_pricing: {
    ko: "순차공개 가격책정",
    en: "Drip pricing",
    law: "전자상거래법 §21조의2①1",
    newly_regulated: true,
    severity: "high",
    desc: "첫 화면에는 총금액 중 일부만 표시하고, 결제가 진행됨에 따라 숨겨진 금액을 순차 공개",
  },
  preselection: {
    ko: "특정옵션 사전선택",
    en: "Preselection",
    law: "전자상거래법 §21조의2①2",
    newly_regulated: true,
    severity: "medium",
    desc: "사업자에게 유리한 선택사항을 미리 선택해두고 소비자가 무심코 수용하도록 유도",
  },
  misleading_hierarchy: {
    ko: "잘못된 계층구조",
    en: "Misleading hierarchy",
    law: "전자상거래법 §21조의2①3",
    newly_regulated: true,
    severity: "high",
    desc: "선택항목 간 시각적으로 현저한 차이를 두어 특정 항목만 선택 가능한 것으로 오인하게 함",
  },
  cancel_obstruction: {
    ko: "취소·탈퇴 방해",
    en: "Cancellation obstruction",
    law: "전자상거래법 §21조의2①4",
    newly_regulated: true,
    severity: "high",
    desc: "가입 절차보다 취소·해지·탈퇴 절차를 복잡하게 하거나 그 방법을 제한",
  },
  nagging: {
    ko: "반복간섭",
    en: "Nagging",
    law: "전자상거래법 §21조의2①5",
    newly_regulated: true,
    severity: "medium",
    desc: "팝업창 등을 통해 특정 행위를 반복적으로 요구하여 소비자를 압박",
  },

  // ── 기존 조항(§13②, §21①1)으로 규율되는 유형 ─────────────────────────
  false_discount: {
    ko: "거짓 할인",
    en: "False discount",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "high",
    desc: "할인 정보를 거짓으로 표시해 높은 가격에 구매하도록 유도",
  },
  false_recommendation: {
    ko: "거짓 추천",
    en: "False recommendation",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "medium",
    desc: "불리한 이용후기를 삭제하거나 유리한 후기를 거짓으로 작성",
  },
  bait_selling: {
    ko: "유인 판매",
    en: "Bait selling",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "high",
    desc: "실제로 판매되지 않는 미끼상품을 판매하는 것처럼 표시·광고",
  },
  disguised_ad: {
    ko: "위장 광고",
    en: "Disguised ad",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "medium",
    desc: "광고를 광고가 아닌 다른 콘텐츠인 것처럼 위장해 제공",
  },
  trick_question: {
    ko: "속임수 질문",
    en: "Trick question",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "high",
    desc: "소비자가 의도하지 않은 대답이나 선택을 하도록 속임수를 써서 질문",
  },
  hidden_information: {
    ko: "숨겨진 정보",
    en: "Hidden information",
    law: "전자상거래법 §13②, §21①1",
    newly_regulated: false,
    severity: "high",
    desc: "구매 결정에 필요한 중요 정보를 은폐·누락·축소",
  },
  comparison_prevention: {
    ko: "가격비교방해",
    en: "Comparison prevention",
    law: "전자상거래법 §21①1",
    newly_regulated: false,
    severity: "medium",
    desc: "여러 상품 사이의 가격·판매조건 비교를 어렵게 만듦",
  },

  // ── 법정 13유형 외 보조 라벨 (HCI 문헌 기준) ────────────────────────
  confirmshaming: {
    ko: "감정적 수치심",
    en: "Confirmshaming",
    law: null,
    newly_regulated: false,
    severity: "medium",
    desc: "거절 선택지에 죄책감·수치심을 유발하는 문구를 붙여 선택을 저해",
  },
  false_urgency: {
    ko: "거짓 긴급성",
    en: "False urgency",
    law: null,
    newly_regulated: false,
    severity: "medium",
    desc: "실제로는 상시 진행되는 프로모션에 마감 임박 표현을 붙여 촉박함을 조성",
  },
  false_scarcity: {
    ko: "거짓 희소성",
    en: "False scarcity",
    law: null,
    newly_regulated: false,
    severity: "medium",
    desc: "재고·잔여 수량을 거짓으로 적게 표시해 구매를 서두르게 함",
  },
  false_evidence: {
    ko: "거짓된 증거",
    en: "False evidence",
    law: null,
    newly_regulated: false,
    severity: "medium",
    desc: "실시간 조회·구매 인원 등 근거 없는 수치로 군중심리를 자극해 구매를 유도",
  },
  forced_action: {
    ko: "강제 행동요구",
    en: "Forced action",
    law: null,
    newly_regulated: false,
    severity: "high",
    desc: "목적과 무관한 행위(설문 필수응답, 전화 연결 등)를 완료해야만 진행되도록 강제",
  },
  visual_interference: {
    ko: "시각적 방해",
    en: "Visual interference",
    law: null,
    newly_regulated: false,
    severity: "medium",
    desc: "토글·체크 상태 표시를 혼동되게 하여 현재 설정을 오인하게 함",
  },
  trick_wording: {
    ko: "속임수 문구",
    en: "Trick wording",
    law: null,
    newly_regulated: false,
    severity: "high",
    desc: "해지와 일시중지처럼 결과가 다른 행위를 유사한 문구로 제시해 혼동을 유도",
  },
};

const PATTERN_IDS = Object.keys(PATTERNS);

function describe(id) {
  const p = PATTERNS[id];
  if (!p) throw new Error(`unknown dark pattern id: ${id}`);
  return { pattern: id, ko: p.ko, law: p.law, severity: p.severity };
}

module.exports = { PATTERNS, PATTERN_IDS, describe };
