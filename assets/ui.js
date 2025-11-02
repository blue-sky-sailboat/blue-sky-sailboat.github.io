/**
 * INU IME Hub — assets/ui.js
 * 역할: 카드/배지/빈/오류 컴포넌트 렌더 + 외부 링크 보안 속성 보장
 * 의존: 없음(바닐라 JS). index.html의 #card-template 사용(없으면 동적 생성).
 *
 * 공개 API (main.js에서 사용)
 *   - ui.renderCards({ listEl, items, type })
 *   - ui.renderEmpty(rootEl, msg?)
 *   - ui.renderError(rootEl, msg?)
 *   - ui.clear(el)
 *   - ui.externalizeLinks(root)
 */

(function (win) {
  "use strict";

  /* ======================= 유틸 ======================= */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const escapeHtml = (s='') =>
    String(s).replace(/[&<>"']/g, (m) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
    );

  const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d;
  };
  const dday = (dateLike) => {
    const d = parseDate(dateLike);
    if (!d) return NaN;
    const now = new Date();
    return Math.ceil((d - now) / 86400000);
  };
  const fmtDate = (v) => {
    const d = parseDate(v);
    if (!d) return String(v || "-");
    // YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const da = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  };

  const ensureExtLinkSecurity = (root) => {
    $$('a[target="_blank"]', root).forEach(a => {
      // noopener + noreferrer로 탭 탈취 방지
      const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      if (!rel.includes('noopener')) rel.push('noopener');
      if (!rel.includes('noreferrer')) rel.push('noreferrer');
      a.setAttribute('rel', rel.join(' ').trim());
    });
  };

  const clear = (el) => { if (el) el.innerHTML = ''; };

  const renderEmpty = (rootEl, msg = '결과가 없습니다.') => {
    if (!rootEl) return;
    rootEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `<p class="text-muted">${escapeHtml(msg)}</p>`;
    rootEl.appendChild(li);
  };

  const renderError = (rootEl, msg = '불러오기 실패 — 잠시 후 다시 시도해 주세요.') => {
    if (!rootEl) return;
    rootEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `<p class="error">${escapeHtml(msg)}</p>`;
    rootEl.appendChild(li);
  };

  /* ==================== 카드 빌더 ===================== */
  const template = (() => /** @returns {HTMLTemplateElement|null} */ ($('#card-template')))();

  function buildCard({ item, type }) {
    // 데이터 맵핑(도메인별 타이틀/출처/마감/보조정보)
    const map = {
      title() {
        switch (type) {
          case 'scholarships': return item.title || '장학금';
          case 'activities':   return `${item.org ?? ''} ${item.role ?? ''}`.trim() || '외부활동';
          case 'jobs':         return `${item.company ?? ''} ${item.role ?? ''}`.trim() || '채용';
          case 'grad':         return `${item.school ?? ''} ${item.lab ?? ''}`.trim() || '대학원';
          default: return '항목';
        }
      },
      source() {
        return item.source || item.org || item.company || item.school || '-';
      },
      deadline() {
        return item.deadline || item.apply_deadline || item.round_deadline || null;
      },
      locType() {
        if (type === 'jobs') return [item.location, item.employment_type].filter(Boolean).join(' / ') || '-';
        if (type === 'activities') return [item.location, item.type].filter(Boolean).join(' / ') || '-';
        return item.location || item.type || '-';
      },
      checkedAt() {
        return item.last_checked_at || '-';
      }
    };

    const deadlineRaw = map.deadline();
    const d = dday(deadlineRaw);
    const badgeText = Number.isFinite(d) ? (d >= 0 ? `D-${d}` : `D+${Math.abs(d)}`) : 'D-?';
    const badgeCls  = Number.isFinite(d) && d <= 7 ? 'badge is-danger' : 'badge is-muted';

    let li;
    if (template && 'content' in template) {
      // 템플릿 클론
      li = template.content.firstElementChild.cloneNode(true);
      // 제목/링크
      const titleA = $('a', li);
      titleA.textContent = map.title();
      titleA.href = item.url || '#';
      titleA.target = '_blank';
      titleA.rel = 'noopener noreferrer';

      // 배지(D-day)
      const badge = $('[data-hook="badge-dday"]', li);
      if (badge) {
        badge.className = `${badgeCls}`;
        badge.removeAttribute('aria-hidden');
        badge.textContent = badgeText;
        badge.setAttribute('data-dday', String(d));
      }

      // 메타
      const metaSource   = $('[data-hook="meta-source"]', li);
      const metaDeadline = $('[data-hook="meta-deadline"]', li);
      const metaLocType  = $('[data-hook="meta-loc-type"]', li);
      const checkedAt    = $('[data-hook="checked-at"]', li);

      if (metaSource)   metaSource.textContent   = map.source();
      if (metaDeadline) metaDeadline.textContent = fmtDate(deadlineRaw) || '-';
      if (metaLocType)  metaLocType.textContent  = map.locType() || '-';
      if (checkedAt)    checkedAt.textContent    = fmtDate(map.checkedAt());

      // 태그
      const tagsUl = $('[data-hook="tags"]', li);
      if (tagsUl) {
        tagsUl.innerHTML = '';
        (item.tags ?? []).slice(0, 8).forEach(t => {
          const tagLi = document.createElement('li');
          tagLi.className = 'badge is-muted';
          tagLi.textContent = String(t);
          tagsUl.appendChild(tagLi);
        });
      }
    } else {
      // 템플릿이 없는 경우 동적 생성(폴백)
      li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `
        <div class="card-head">
          <span class="${badgeCls}" data-dday="${Number.isFinite(d) ? d : ''}">${badgeText}</span>
          <h3 class="card-title">
            <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(map.title())}</a>
          </h3>
        </div>
        <div class="card-body">
          <ul class="meta">
            <li><span class="meta-key">출처</span> <span>${escapeHtml(map.source())}</span></li>
            <li><span class="meta-key">마감</span> <time>${escapeHtml(fmtDate(deadlineRaw) || '-')}</time></li>
            <li><span class="meta-key">위치/유형</span> <span>${escapeHtml(map.locType() || '-')}</span></li>
          </ul>
          <ul class="tags">
            ${(item.tags ?? []).slice(0,8).map(t => `<li class="badge is-muted">${escapeHtml(String(t))}</li>`).join('')}
          </ul>
        </div>
        <div class="card-foot">
          <span class="check-date">확인일 <time>${escapeHtml(fmtDate(map.checkedAt()))}</time></span>
          <button type="button" class="btn btn-ghost" data-hook="bookmark" aria-label="북마크">
            <span class="btn-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg>
            </span>
            <span class="sr-only">북마크</span>
          </button>
        </div>
      `;
    }

    // 안전: 외부 링크 보안 속성
    ensureExtLinkSecurity(li);
    return li;
  }

  /* ==================== 리스트 렌더러 ==================== */
  function renderCards({ listEl, items, type }) {
    if (!listEl) return;
    clear(listEl);

    // 접근성: 목록을 비운 다음 항목 추가
    const frag = document.createDocumentFragment();
    items.forEach(item => frag.appendChild(buildCard({ item, type })));
    listEl.appendChild(frag);
  }

  /* ================ 전역 내보내기 ================= */
  win.ui = {
    renderCards,
    renderEmpty,
    renderError,
    clear,
    externalizeLinks: ensureExtLinkSecurity
  };

})(window);
