/**
 * INU IME Hub — assets/main.js
 * 역할: 데이터 로드(fetch /data/*.json) · 탭/검색/필터/정렬/상태관리 · 키보드 내비게이션
 * 의존: assets/ui.js (선호, 없으면 안전한 폴백 렌더)
 *
 * 규약(요약)
 * - index.html 내 data-hook 기반으로 DOM을 찾고, 탭/검색/필터/목록에 바인딩
 * - /data/*.json을 필요 시점에 fetch (메모리 캐시)
 * - 검색은 300ms 디바운스, 현재 탭에만 적용
 * - 정렬: 장학금/활동/채용/대학원 = 각 마감일 ASC
 * - D-Day: ceil((deadline - now)/86400000) 계산(<=7 강조 플래그 부여는 ui.js에서 수행)
 * - 상태: 로딩/빈/오류 표시(시각적 제어는 main.js, 마크업은 index.html)
 * - 키보드: 좌/우 화살표로 탭 이동, Tab/Shift+Tab으로 포커스
 * - 공유: 현재 탭/검색/필터를 URL 쿼리로 동기화 & 복사
 */

/* ========================== 유틸리티 ==================================== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const debounce = (fn, wait=300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const memo = (fn) => {
  const cache = new Map();
  return async (key) => {
    if (cache.has(key)) return cache.get(key);
    const p = fn(key).catch(err => { cache.delete(key); throw err; });
    cache.set(key, p);
    return p;
  };
};

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const dday = (dateLike) => {
  const d = parseDate(dateLike);
  if (!d) return NaN;
  const now = new Date();
  // 자정 기준이 아닌 “지금” 기준, 절대일수 올림
  return Math.ceil((d - now) / 86400000);
};

const dateCmpAsc = (a, b) => {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da && !db) return 0;
  if (!da) return 1;   // 유효 마감일이 없는 항목을 뒤로
  if (!db) return -1;
  return da - db;
};

const lastCheckedCmpDesc = (a, b) => {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return db - da;
};

const normalizeStr = (s='') =>
  String(s).toLowerCase().normalize('NFKC').trim();

/* ========================== 데이터 로더 ================================== */
const endpoints = {
  scholarships: 'data/scholarships.json',
  activities:   'data/activities.json',
  jobs:         'data/jobs.json',
  grad:         'data/grad.json',
};

const fetchJSON = memo(async (url) => {
  // 캐시방지는 필요 시 쿼리 추가. 정적 배포에서는 ETag/Cache-Control 활용 가정.
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const e = new Error(`Fetch failed: ${url} ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
});

/* ========================== UI 어댑터 ==================================== */
/**
 * ui.js 권장 인터페이스 (존재 시 사용)
 * - ui.renderCards({ listEl, items, type }) : 리스트에 카드 렌더
 * - ui.clear(el)                             : el 하위 비우기
 * - ui.renderEmpty(el, msg?)
 * - ui.renderError(el, msg?)
 * - ui.externalizeLinks(root)                : target=_blank + rel 보장
 *
 * 없을 때 폴백: main.js가 아주 단순한 카드 렌더링을 수행
 */
const UI = (() => {
  const hasUI = typeof window.ui !== 'undefined';

  const clear = (el) => { if (el) el.innerHTML = ''; };

  const externalizeLinks = (root) => {
    $$('a[target="_blank"]', root).forEach(a => {
      a.rel = 'noopener noreferrer';
    });
  };

  const renderEmpty = (el, msg='결과가 없습니다.') => {
    if (!el) return;
    el.innerHTML = `<li class="card"><p class="text-muted">${msg}</p></li>`;
  };

  const renderError = (el, msg='불러오기 실패 — 잠시 후 다시 시도해 주세요.') => {
    if (!el) return;
    el.innerHTML = `<li class="card"><p class="error">${msg}</p></li>`;
  };

  const renderCardsFallback = ({ listEl, items, type }) => {
    if (!listEl) return;
    clear(listEl);

    const mapTitle = (it) => {
      switch (type) {
        case 'scholarships': return it.title || '장학금';
        case 'activities':   return `${it.org ?? ''} ${it.role ?? ''}`.trim() || '외부활동';
        case 'jobs':         return `${it.company ?? ''} ${it.role ?? ''}`.trim() || '채용';
        case 'grad':         return `${it.school ?? ''} ${it.lab ?? ''}`.trim() || '대학원';
        default: return '항목';
      }
    };

    const mapSource = (it) => it.source || it.org || it.company || it.school || '-';

    const mapDeadline = (it) => (
      it.deadline || it.apply_deadline || it.round_deadline || '-'
    );

    const mapLocType = (it) => {
      if (type === 'jobs') return [it.location, it.employment_type].filter(Boolean).join(' / ') || '-';
      if (type === 'activities') return [it.location, it.type].filter(Boolean).join(' / ') || '-';
      return it.location || it.type || '-';
    };

    const mapCheckedAt = (it) => it.last_checked_at || '-';

    items.forEach(it => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `
        <div class="card-head">
          <span class="badge ${Number.isFinite(dday(mapDeadline(it))) && dday(mapDeadline(it)) <= 7 ? 'is-danger' : 'is-muted'}" data-dday="${dday(mapDeadline(it))}">
            ${Number.isFinite(dday(mapDeadline(it))) ? `D-${dday(mapDeadline(it))}` : 'D-?'}
          </span>
          <h3 class="card-title">
            <a href="${it.url ?? '#'}" target="_blank" rel="noopener noreferrer">${escapeHtml(mapTitle(it))}</a>
          </h3>
        </div>
        <div class="card-body">
          <ul class="meta">
            <li><span class="meta-key">출처</span> <span>${escapeHtml(mapSource(it))}</span></li>
            <li><span class="meta-key">마감</span> <time>${escapeHtml(mapDeadline(it))}</time></li>
            <li><span class="meta-key">위치/유형</span> <span>${escapeHtml(mapLocType(it))}</span></li>
          </ul>
          <ul class="tags">
            ${(it.tags ?? []).slice(0, 8).map(t => `<li class="badge is-muted">${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
        <div class="card-foot">
          <span class="check-date">확인일 <time>${escapeHtml(mapCheckedAt(it))}</time></span>
          <button type="button" class="btn btn-ghost" data-hook="bookmark" aria-label="북마크">
            <span class="btn-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 4h12v16l-6-4-6 4z"/></svg>
            </span>
            <span class="sr-only">북마크</span>
          </button>
        </div>
      `;
      listEl.appendChild(li);
    });

    externalizeLinks(listEl);
  };

  const renderCards = hasUI ? window.ui.renderCards : renderCardsFallback;

  return { clear, renderEmpty, renderError, renderCards, externalizeLinks };
})();

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/* ========================== 상태 표시 제어 ================================= */
function showState(panelEl, state /* 'loading'|'empty'|'error'|null */) {
  const loadingEl = $('[data-hook="loading"]', panelEl);
  const emptyEl   = $('[data-hook="empty"]', panelEl);
  const errorEl   = $('[data-hook="error"]', panelEl);

  if (loadingEl) loadingEl.hidden = state !== 'loading';
  if (emptyEl)   emptyEl.hidden   = state !== 'empty';
  if (errorEl)   errorEl.hidden   = state !== 'error';
}

/* ========================== 검색/필터/정렬 로직 =========================== */
function matchesQuery(item, q) {
  if (!q) return true;
  const needle = normalizeStr(q);
  const hay = normalizeStr(
    JSON.stringify(item, (k, v) => {
      // 긴 본문/불필요한 필드는 생략할 수 있음(여기서는 단순 처리)
      return v;
    })
  );
  return hay.includes(needle);
}

function applyFilters(type, items, filters) {
  switch (type) {
    case 'scholarships': {
      const { gpaMin, gradeYear } = filters;
      return items.filter(it => {
        if (gpaMin) {
          const min = Number(gpaMin);
          const ok = Number((it.eligibility && it.eligibility.gpa_min) ?? 0) >= min || // gpa_min 자체가 “최소 요구”이면 >= 비교 재검토
                     Number((it.eligibility && it.eligibility.gpa_min) ?? 0) <= min; // 스키마 해석이 다른 경우를 대비(보수적)
          // 안전하게: gpa_min이 존재하고 min보다 큰 경우 “상향요구”로 간주 → 통과, 없으면 일단 통과
          if (it.eligibility && typeof it.eligibility.gpa_min === 'number') {
            if (it.eligibility.gpa_min > min) return false; // 요구치가 더 높으면 제외
          }
        }
        if (gradeYear) {
          const gy = String(gradeYear);
          const arr = (it.eligibility && Array.isArray(it.eligibility.grade_year)) ? it.eligibility.grade_year.map(String) : null;
          if (arr && !arr.includes(gy)) return false;
        }
        return true;
      });
    }
    case 'activities': {
      const { type: actType } = filters;
      if (!actType) return items;
      return items.filter(it => String(it.type || '') === String(actType));
    }
    case 'jobs': {
      const { jobType, location } = filters;
      return items.filter(it => {
        const okType = jobType ? String(it.employment_type || '') === String(jobType) : true;
        const okLoc  = location ? normalizeStr(it.location || '').includes(normalizeStr(location)) : true;
        return okType && okLoc;
      });
    }
    case 'grad': {
      const { field } = filters;
      if (!field) return items;
      const needle = normalizeStr(field);
      return items.filter(it => (it.field || []).some(f => normalizeStr(f).includes(needle)));
    }
    default:
      return items;
  }
}

function extractDeadline(type, item) {
  return item.deadline || item.apply_deadline || item.round_deadline || null;
}

function sortForDeadlineAsc(type, items) {
  return items.slice().sort((a, b) => dateCmpAsc(extractDeadline(type, a), extractDeadline(type, b)));
}

function sortByLastCheckedDesc(items) {
  return items.slice().sort((a, b) => lastCheckedCmpDesc(a.last_checked_at, b.last_checked_at));
}

/* ========================== 렌더 파이프라인 ============================== */
async function renderTab({ type, panelEl, q, filters }) {
  // 상태 초기화
  showState(panelEl, 'loading');
  const deadlineList = $('[data-hook="deadline-list"]', panelEl);
  const recentList   = $('[data-hook="recent-list"]', panelEl);

  UI.clear(deadlineList);
  UI.clear(recentList);

  try {
    const url = endpoints[type];
    if (!url) throw new Error('Unknown tab type: ' + type);

    const raw = await fetchJSON(url);
    const arr = Array.isArray(raw) ? raw : [];

    // 검색 & 필터
    let view = arr.filter(it => matchesQuery(it, q));
    view = applyFilters(type, view, filters);

    // 섹션 1: 마감 임박 (D ≤ 7 우선 추출 후 마감일 오름차순 상위 6~12개)
    const soon = sortForDeadlineAsc(type, view)
      .filter(it => {
        const dl = extractDeadline(type, it);
        const d  = dday(dl);
        return Number.isFinite(d) && d <= 7;
      })
      .slice(0, 12);

    // 섹션 2: 최근 업데이트 (last_checked_at 내림차순 10~20개)
    const recent = sortByLastCheckedDesc(view)
      .slice(0, 20);

    // 상태 처리
    showState(panelEl, null);

    if (soon.length === 0 && recent.length === 0) {
      showState(panelEl, 'empty');
      return;
    }

    if (soon.length > 0) {
      UI.renderCards({ listEl: deadlineList, items: soon, type });
    } else {
      UI.renderEmpty(deadlineList, '7일 이내 마감 항목이 없습니다.');
    }

    if (recent.length > 0) {
      UI.renderCards({ listEl: recentList, items: recent, type });
    } else {
      UI.renderEmpty(recentList, '최근 업데이트 항목이 없습니다.');
    }

  } catch (err) {
    console.error('[main.js] renderTab error:', err);
    showState(panelEl, 'error');
    const recentList = $('[data-hook="recent-list"]', panelEl);
    UI.renderError(recentList, '데이터를 불러오지 못했습니다.');
  }
}

/* ========================== 탭/검색/필터 바인딩 ========================== */
const state = {
  tab: 'scholarships',
  q: '',
  filters: {
    scholarships: { gpaMin: '', gradeYear: '' },
    activities:   { type: '' },
    jobs:         { jobType: '', location: '' },
    grad:         { field: '' },
  }
};

function getPanelEl(tab) {
  return document.getElementById(`panel-${tab}`);
}

function setActiveTab(tab) {
  state.tab = tab;

  // aria-selected & tabindex & hidden
  $$( '[data-hook="tab"]' ).forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.tabIndex = isActive ? 0 : -1;
  });

  $$('[data-hook="tabpanel"]').forEach(panel => {
    const shouldShow = panel.id === `panel-${tab}`;
    panel.hidden = !shouldShow;
  });

  // 필터 영역 표시 토글
  const filtersRoot = $('[data-hook="filters"]');
  if (filtersRoot) {
    $$('[data-hook^="filters-"]', filtersRoot).forEach(f => f.hidden = true);
    const current = $(`[data-hook="filters-${tab}"]`, filtersRoot);
    if (current) current.hidden = false;
  }

  // URL 동기화
  syncURL();

  // 렌더
  const panelEl = getPanelEl(tab);
  renderTab({
    type: tab,
    panelEl,
    q: state.q,
    filters: state.filters[tab] || {}
  });
}

function bindTabs() {
  const tabButtons = $$('[data-hook="tab"]');
  const tablist = $('[data-hook="tablist"]');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // 키보드 좌/우 화살표
  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();

      const tabs = $$('[data-hook="tab"]', tablist);
      const current = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      let next = current;

      if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (e.key === 'ArrowLeft')  next = (current - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home')       next = 0;
      if (e.key === 'End')        next = tabs.length - 1;

      const btn = tabs[next];
      if (btn) {
        btn.focus();
        setActiveTab(btn.dataset.tab);
      }
    });
  }
}

function bindSearch() {
  const input = $('[data-hook="search-input"]');
  if (!input) return;

  const onChange = debounce(() => {
    state.q = input.value || '';
    syncURL();
    setActiveTab(state.tab); // 현재 탭 다시 렌더
  }, 300);

  input.addEventListener('input', onChange);
}

function bindFilters() {
  // 장학금
  const schGpa   = $('[data-hook="filter-sch-gpa"]');
  const schGrade = $('[data-hook="filter-sch-grade"]');
  schGpa?.addEventListener('change', () => {
    state.filters.scholarships.gpaMin = schGpa.value;
    syncURL(); setActiveTab('scholarships');
  });
  schGrade?.addEventListener('change', () => {
    state.filters.scholarships.gradeYear = schGrade.value;
    syncURL(); setActiveTab('scholarships');
  });

  // 외부활동
  const actType = $('[data-hook="filter-act-type"]');
  actType?.addEventListener('change', () => {
    state.filters.activities.type = actType.value;
    syncURL(); setActiveTab('activities');
  });

  // 채용
  const jobType = $('[data-hook="filter-job-type"]');
  const jobLoc  = $('[data-hook="filter-job-location"]');
  jobType?.addEventListener('change', () => {
    state.filters.jobs.jobType = jobType.value;
    syncURL(); setActiveTab('jobs');
  });
  jobLoc?.addEventListener('input', debounce(() => {
    state.filters.jobs.location = jobLoc.value;
    syncURL(); setActiveTab('jobs');
  }, 300));

  // 대학원
  const gradField = $('[data-hook="filter-grad-field"]');
  gradField?.addEventListener('input', debounce(() => {
    state.filters.grad.field = gradField.value;
    syncURL(); setActiveTab('grad');
  }, 300));
}

/* ========================== URL 동기화/공유 =============================== */
function syncURL(push=false) {
  const url = new URL(location.href);
  url.searchParams.set('tab', state.tab);
  if (state.q) url.searchParams.set('q', state.q); else url.searchParams.delete('q');

  // 탭별 필터를 직렬화(간단히 쿼리 적용)
  const f = state.filters[state.tab] || {};
  Object.entries(f).forEach(([k, v]) => {
    const key = `${state.tab}.${k}`;
    if (v) url.searchParams.set(key, v);
    else url.searchParams.delete(key);
  });

  if (push) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
}

function restoreFromURL() {
  const url = new URL(location.href);
  const tab = url.searchParams.get('tab');
  const q   = url.searchParams.get('q') || '';
  state.q = q;

  // 인풋 반영
  const searchEl = $('[data-hook="search-input"]');
  if (searchEl) searchEl.value = state.q;

  // 탭별 필터 복원
  ['scholarships','activities','jobs','grad'].forEach(t => {
    const entries = Object.entries(state.filters[t] || {});
    entries.forEach(([k]) => {
      const key = `${t}.${k}`;
      const val = url.searchParams.get(key) || '';
      state.filters[t][k] = val;

      // UI 반영
      const hookMap = {
        'scholarships.gpaMin':   '[data-hook="filter-sch-gpa"]',
        'scholarships.gradeYear':'[data-hook="filter-sch-grade"]',
        'activities.type':       '[data-hook="filter-act-type"]',
        'jobs.jobType':          '[data-hook="filter-job-type"]',
        'jobs.location':         '[data-hook="filter-job-location"]',
        'grad.field':            '[data-hook="filter-grad-field"]',
      };
      const sel = hookMap[`${t}.${k}`];
      if (sel) {
        const el = $(sel);
        if (el) el.value = val;
      }
    });
  });

  return tab || 'scholarships';
}

function bindShare() {
  const btn = $('[data-hook="share-link"]');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    // 최신 URL 반영
    syncURL();
    const text = location.href;
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('is-copied');
      btn.setAttribute('aria-label', '링크 복사 완료');
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.setAttribute('aria-label', '현재 보기 링크 복사');
      }, 1500);
    } catch {
      // 폴백: prompt
      window.prompt('아래 링크를 복사하세요:', text);
    }
  });
}

/* ========================== 부트스트랩 ==================================== */
function initYear() {
  const y = $('[data-hook="year"]');
  if (y) y.textContent = String(new Date().getFullYear());
}

function init() {
  bindTabs();
  bindSearch();
  bindFilters();
  bindShare();
  initYear();

  const initialTab = restoreFromURL();
  setActiveTab(initialTab);

  // 외부 링크 보안 속성 보장(ui.js가 있을 때는 그쪽에서 처리)
  UI.externalizeLinks(document);
}

document.addEventListener('DOMContentLoaded', init);

/* ========================== 끝 =========================================== */
