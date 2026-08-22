"""
DOM 추출 레이어
----------------
팀 mock-services의 계약(CONTRACT.md)을 그대로 따른다: 다크패턴 판단 대상은
`[data-el]` 블록, 클릭 가능한 조작 대상은 `[data-testid]` 요소. 이전 파일럿의
detector.py와 달리 텍스트 셀렉터나 CSS 클래스는 전혀 쓰지 않는다 — 이 프로젝트
자체가 "텍스트 셀렉터를 쓰지 말 것. 목업 담당이 문구를 바꾸면 즉시 깨진다"고
명시했기 때문에, data-el/data-testid만 앵커로 쓰는 것이 계약을 지키는 것이자
가장 견고한 방식이다.

주의: 일부 페이지(예: 서비스 전체를 감싸는 `def.form` 래퍼로 만들어진 제출 버튼)는
제출 버튼이 어떤 `[data-el]` 블록 "안"에도 들어있지 않다 — 페이지 프레임이 블록
목록 바깥에 버튼을 붙이기 때문이다. 그래서 블록 단위로만 [data-testid]를 훑으면
이런 버튼을 통째로 놓친다. 이 파일은 [data-testid]/라디오/체크박스를 문서 전체에서
한 번에 훑은 뒤, 각 요소가 어느 [data-el] 블록 "안"에 있는지(`closest`)를 따로
판정해서 블록에 속하는 후보와 어디에도 안 속하는 페이지 레벨 후보를 나눈다.

브라우저 안에 JS를 주입해서(page.evaluate) 각 [data-el] 블록의 텍스트/명암비와
문서 전체의 [data-testid] 후보들(텍스트/면적/폰트굵기/체크상태)을 한 번에 읽어온다.
"""
from __future__ import annotations

_EXTRACT_JS = r"""
() => {
  function luminance(rgb) {
    const m = rgb.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.map(Number);
    const chan = c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  }
  function contrastRatio(fg, bg) {
    const l1 = luminance(fg), l2 = luminance(bg);
    if (l1 == null || l2 == null) return null;
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function effectiveBackground(el) {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      node = node.parentElement;
    }
    return 'rgb(255, 255, 255)';
  }

  // ── 1) [data-el] 블록: 텍스트 + 명암비/폰트 최악값 ──────────────────
  const blockMeta = {}; // el -> {text, rect, minContrast, minFontSize, candidates:[]}
  document.querySelectorAll('[data-el]').forEach(blockEl => {
    const el = blockEl.getAttribute('data-el');
    const rect = blockEl.getBoundingClientRect();
    const text = (blockEl.innerText || '').trim();

    let minContrast = null, minFontSize = null;
    blockEl.querySelectorAll('*').forEach(node => {
      const t = (node.innerText || '').trim();
      if (!t || node.children.length > 0) return;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const cr = contrastRatio(style.color, effectiveBackground(node));
      const fs = parseFloat(style.fontSize);
      if (cr != null && (minContrast === null || cr < minContrast)) minContrast = cr;
      if (fs && (minFontSize === null || fs < minFontSize)) minFontSize = fs;
    });

    blockMeta[el] = {
      text, left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      min_contrast: minContrast, min_font_size: minFontSize, candidates: [],
    };
  });

  // ── 2) 조작 가능 후보: 문서 전체를 한 번에 훑는다 ────────────────────
  // [data-el] 블록 "안"에서만 찾으면, 페이지 프레임이 블록 목록 바깥에 붙이는
  // 제출 버튼(예: 회원가입 폼의 최종 제출 버튼)을 놓친다. 그래서 문서 전체를
  // 훑고, 각 요소가 어느 블록 안에 있는지는 closest('[data-el]')로 나중에 판정한다.
  const pageCandidates = [];
  const seen = new Set();
  function pushCandidate(node, testid) {
    if (seen.has(node)) return;
    seen.add(node);
    const tag = node.tagName.toLowerCase();
    const nrect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    let label = (node.innerText || node.value || '').trim();
    if (tag === 'input') {
      const lab = node.closest('label');
      if (lab) label = lab.innerText.trim();
    }
    const form = node.closest('form');
    const owningBlock = node.closest('[data-el]');
    const freeText = tag === 'input' && ['text', 'tel', 'number', 'email', null].includes(node.type || null);
    const cand = {
      testid: testid || null,
      // 라디오/체크박스는 value가 고정된 열거값이라 name+value로 특정하지만,
      // 자유입력 텍스트필드는 값이 채워지는 대상이라 name만으로 특정해야 한다
      // (안 그러면 처음엔 value=""로 찾다가 채운 뒤엔 못 찾는 셀렉터가 된다).
      select_by: testid ? 'testid' : (freeText ? 'name' : 'name_value'),
      tag,
      input_type: node.type || null,
      name: node.name || null,
      value: (tag === 'input') ? node.value : null,
      text: label,
      checked: 'checked' in node ? node.checked : null,
      required: 'required' in node ? node.required : null,
      pattern: node.getAttribute ? node.getAttribute('pattern') : null,
      inputmode: node.getAttribute ? node.getAttribute('inputmode') : null,
      minlength: node.getAttribute ? node.getAttribute('minlength') : null,
      maxlength: node.getAttribute ? node.getAttribute('maxlength') : null,
      href: node.getAttribute('href') || null,
      form_action: form ? form.getAttribute('action') : null,
      background: style.backgroundColor,
      color: style.color,
      font_size: parseFloat(style.fontSize),
      font_weight: style.fontWeight,
      left: nrect.left, top: nrect.top, width: nrect.width, height: nrect.height,
      area: nrect.width * nrect.height,
    };
    if (owningBlock && blockMeta[owningBlock.getAttribute('data-el')]) {
      blockMeta[owningBlock.getAttribute('data-el')].candidates.push(cand);
    } else {
      pageCandidates.push(cand); // 어떤 [data-el] 블록에도 속하지 않는 후보
    }
  }
  document.querySelectorAll('[data-testid]').forEach(node => pushCandidate(node, node.getAttribute('data-testid')));
  document.querySelectorAll('input[type=radio], input[type=checkbox]').forEach(node => pushCandidate(node, null));
  document.querySelectorAll(
    'input[type=text], input[type=tel], input[type=number], input[type=email], input:not([type])'
  ).forEach(node => pushCandidate(node, null));

  const blocks = Object.entries(blockMeta).map(([el, m]) => ({ el, ...m }));

  return { path: location.pathname, title: document.title, blocks, page_candidates: pageCandidates };
}
"""


def extract(page) -> dict:
    """현재 페이지에서 [data-el] 블록들과 문서 전체의 [data-testid]/라디오/체크박스
    조작 후보를 추출. 블록 밖에 있는 후보(예: 페이지 전체를 감싸는 제출 버튼)는
    raw["page_candidates"]에 별도로 담긴다."""
    return page.evaluate(_EXTRACT_JS)


def all_candidates(raw: dict) -> list[dict]:
    """페이지 전체의 클릭 가능 후보를 블록 구분 없이 평평하게 모은다 (내비게이션 판단용)."""
    out = []
    for b in raw["blocks"]:
        for c in b["candidates"]:
            c = dict(c)
            c["el"] = b["el"]
            out.append(c)
    for c in raw.get("page_candidates", []):
        c = dict(c)
        c["el"] = None
        out.append(c)
    return out
