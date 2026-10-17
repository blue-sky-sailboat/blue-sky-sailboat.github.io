'use strict';
(() => {
  const data = window.SANGYEONG_DATA;
  if (!data) return;
  const $ = (selector) => document.querySelector(selector);
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    gift: '<path d="M4 10v11h16V10M2 6h20v4H2Zm10 0v15"/><path d="M12 6C6 7 5 3 7 2c3-2 5 4 5 4Zm0 0s2-6 5-4c2 1 1 5-5 4Z"/>',
    flag: '<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
    cap: '<path d="m2 8 10-5 10 5-10 5Zm4 3v6c4 3 8 3 12 0v-6m4-3v8"/>',
    bag: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0m-9 0v4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    pen: '<path d="m16 3 5 5-12 12-6 1 1-6Zm-2 2 5 5M4 15l5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const richTitle = (value) => escape(value).replace(/&lt;br&gt;/g, '<br>');
  const storage = {
    read(key) { try { const parsed = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []; } catch { return []; } },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  };
  let saved = new Set(storage.read('sangyeong-saved-v1').filter((id) => data.resources.some((item) => item.id === id)));
  let checked = new Set(storage.read('sangyeong-checklist-v1').filter((id) => data.checklist.some((item) => item.id === id)));
  let query = '';
  let route = 'home';
  let category = 'all';
  let toastTimer;
  let previousDialogFocus;
  const dialog = $('#detail-dialog');

  function paintIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
  }
  function showDialog(title, eyebrow, html) {
    previousDialogFocus = document.activeElement;
    $('#dialog-title').textContent = title;
    $('#dialog-eyebrow').textContent = eyebrow;
    $('#dialog-body').innerHTML = html;
    paintIcons(dialog);
    dialog.showModal();
    dialog.scrollTop = 0;
    $('#dialog-close').focus();
  }
  function hideDialog() {
    dialog.close();
    if (previousDialogFocus && document.contains(previousDialogFocus)) previousDialogFocus.focus();
  }
  function renderList() {
    const terms = query.trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    const resources = data.resources.filter((item) => {
      if (route === 'saved' && !saved.has(item.id)) return false;
      if (category !== 'all' && item.category !== category) return false;
      const label = data.categories.find((group) => group.id === item.category).label;
      const haystack = `${item.title} ${item.description} ${item.keywords} ${item.source} ${label}`.toLocaleLowerCase('ko');
      return terms.every((term) => haystack.includes(term));
    });
    $('#filter-tabs').innerHTML = data.categories.map((item) => `<button class="filter-tab${category === item.id ? ' active' : ''}" data-filter="${item.id}" aria-pressed="${category === item.id}">${item.label}</button>`).join('');
    $('#resource-list').innerHTML = resources.map((item) => {
      const label = data.categories.find((group) => group.id === item.category).label;
      return `<article class="resource-row"><span class="category-label ${item.category}">${label}</span><div><h3><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.title)}<span class="row-external" aria-label="새 탭에서 열기">↗</span></a></h3><p class="resource-summary">${escape(item.description)}</p><div class="resource-meta"><span>${escape(item.source)}</span><span>경로 확인 ${escape(item.checked)}</span><span class="link-type">${escape(item.type)}</span></div></div><button class="save-button" data-save="${item.id}" aria-label="${escape(item.title)} ${saved.has(item.id) ? '저장 해제' : '저장'}" aria-pressed="${saved.has(item.id)}">${icon('bookmark')}</button></article>`;
    }).join('');
    $('#result-count').innerHTML = `${query ? `‘${escape(query)}’ 검색 결과 ` : ''}<strong>${resources.length}</strong>개의 정보`;
    $('#empty-state').hidden = resources.length > 0;
    $('#empty-description').textContent = route === 'saved' && saved.size === 0 ? '정보 옆의 책갈피 버튼을 누르면 이곳에 모아볼 수 있어요.' : '다른 검색어나 분야를 선택해 보세요.';
    $('#saved-count').textContent = saved.size;
  }
  function renderRoute(shouldScroll = true) {
    const parts = location.hash.replace(/^#/, '').split('/');
    route = ['home', 'notices', 'archive', 'guide', 'saved'].includes(parts[0]) ? parts[0] : 'home';
    category = route === 'notices' && data.categories.some((item) => item.id === parts[1]) ? parts[1] : 'all';
    if (route !== 'notices' && route !== 'saved') { query = ''; $('#site-search').value = ''; }
    $('#home-intro').hidden = route !== 'home';
    $('#information-section').hidden = !['home', 'notices', 'saved'].includes(route);
    $('#archive-section').hidden = !['home', 'archive'].includes(route);
    $('#guide-section').hidden = !['home', 'guide'].includes(route);
    $('#right-rail').hidden = route === 'archive' || route === 'guide';
    $('.content-layout').style.gridTemplateColumns = route === 'archive' || route === 'guide' ? 'minmax(0, 1fr)' : '';
    $('#all-information-link').hidden = route !== 'home';
    $('#information-title').innerHTML = route === 'saved' ? '저장한 정보<span class="heading-dot">.</span>' : '필요한 정보, 모아보기<span class="heading-dot">.</span>';
    $('#information-kicker').textContent = route === 'saved' ? 'KEEP WHAT MATTERS TO YOU' : 'FIND YOUR OPPORTUNITY';
    $('#information-description').textContent = route === 'saved' ? '이 브라우저에 저장한 공식 정보입니다. 다른 기기와는 동기화되지 않아요.' : '자주 찾는 공식 게시판과 안내를 한곳에서 확인하세요.';
    document.querySelectorAll('[data-nav]').forEach((element) => { const active = element.dataset.nav === route; element.classList.toggle('active', active); if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); });
    document.body.classList.toggle('focus-view', route !== 'home');
    const names = { home: '우리의 다음을 모으다', notices: '정보 모아보기', archive: '경험 아카이브', guide: '전공·진로 길잡이', saved: '저장한 정보' };
    document.title = `산경모아 — ${names[route]}`;
    renderList();
    if (shouldScroll) { window.scrollTo({ top: 0, behavior: 'instant' }); $('#main').focus({ preventScroll: true }); }
  }
  function renderArchive() {
    $('#archive-cards').innerHTML = data.articles.map((article) => `<button class="archive-card" data-article="${article.id}"><div class="archive-art ${article.art}"><div class="art-grid"></div><span class="art-step">${article.kicker}</span><div class="art-paper">${icon(article.icon)}</div><span class="art-sticker" aria-hidden="true">${article.id === 'competition' ? '✳' : '↗'}</span></div><div class="archive-card-body"><div class="article-tag">${article.category}<span>편집 가이드</span></div><h3>${richTitle(article.title)}</h3><p>${richTitle(article.description)}</p><div class="article-bottom"><span>${article.read}</span><b aria-hidden="true">↗</b></div></div></button>`).join('');
    $('#field-cards').innerHTML = data.fields.map((field, index) => `<button class="field-card" data-field="${field.id}"><div class="field-index">0${index + 1}<span aria-hidden="true">↗</span></div><h3>${field.title}</h3><p>${richTitle(field.description)}</p></button>`).join('');
  }
  function renderChecklist() {
    $('#semester-checklist').innerHTML = data.checklist.map((item) => `<label class="check-item"><input type="checkbox" data-check="${item.id}"${checked.has(item.id) ? ' checked' : ''}><span>${item.label}</span></label>`).join('');
    updateChecklistProgress();
  }
  function updateChecklistProgress() {
    $('#checklist-status').textContent = `${checked.size} / ${data.checklist.length} 확인`;
    $('#checklist-progress-bar').style.width = `${checked.size / data.checklist.length * 100}%`;
  }
  function openArticle(id) {
    const article = data.articles.find((item) => item.id === id);
    if (!article) return;
    showDialog(article.title.replace(/<br>/g, ' '), `${article.category} · 편집 가이드`, `<div class="dialog-callout">${escape(article.intro)}</div>${article.sections.map((section) => `<h3>${escape(section.title)}</h3><ul>${section.items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`).join('')}<div class="dialog-actions"><button class="button button-dark" data-action="contribute">나의 준비 경험도 남기기 ${icon('pen')}</button></div>`);
  }
  function openField(id) {
    const field = data.fields.find((item) => item.id === id);
    if (!field) return;
    showDialog(field.title, '전공·진로 길잡이 · 편집 가이드', `<h3>${field.question}</h3><p>${field.body}</p><h3>작게 시작해 보기</h3><ul>${field.activities.map((item) => `<li>${item}</li>`).join('')}</ul><div class="dialog-callout">학과의 공식 트랙 안내가 아닙니다. 실제 개설 과목과 이수 기준은 <a href="https://www.inu.ac.kr/ime/3093/subview.do" target="_blank" rel="noopener noreferrer">학과 교육과정 ↗</a>을 확인하세요.</div><div class="dialog-actions"><button class="button button-dark" data-field-search="${field.id}">관련 정보 찾아보기 ${icon('arrow')}</button></div>`);
  }
  const recordTemplate = `# 나의 준비 경험\n\n- 주제: 경진대회 / 취업 준비\n- 공개 이름: 실명 / 익명\n- 경험한 연도·기간:\n- 당시 학년·상황:\n\n## 무엇을 목표로 시작했나요?\n\n## 무엇부터, 어떤 순서로 준비했나요?\n\n## 내가 맡은 역할과 실제로 한 일\n\n## 도움이 된 자료·도구와 출처\n\n## 가장 어려웠던 점과 시행착오\n\n## 결과, 배운 점, 이 경험의 한계\n\n## 다시 한다면 바꾸고 싶은 점\n\n## 후배에게 권할 첫 행동 하나\n\n## 공개 전 확인\n- 함께한 사람의 동의와 자료 공개 범위를 확인했나요?\n- 비공개 기업·개인 정보는 제외했나요?\n- 게시 전 최종 내용을 확인했나요?\n\n※ 이 파일은 작성용입니다. 사이트에서 자동 제출되지 않습니다.\n`;
  function openContribute() {
    if (dialog.open) dialog.close();
    showDialog('당신의 준비 과정이 다음 시작이 되도록.', '함께 쓰는 경험 아카이브', '<p>대회 준비나 취업 준비를 하며 무엇부터 시작했는지, 어떤 시행착오가 있었는지 남겨주세요. 수상·합격 여부와 관계없이 준비 과정 자체가 좋은 자료가 됩니다.</p><h3>이렇게 기록해요</h3><ol><li>아래 양식을 복사하거나 내려받아 편한 만큼 작성해요.</li><li>실명·익명과 자료 공개 범위를 선택해요.</li><li>게시 전 운영자와 최종 내용을 확인해요.</li></ol><div class="dialog-callout"><strong>현재는 첫 화면 초안으로, 온라인 제출과 운영 연락처는 아직 준비 중입니다.</strong><br>양식은 개인 파일로 저장할 수 있어요. 개인 연락처나 비공개 자료를 공개 GitHub에 올리지 마세요.</div><div class="dialog-actions"><button class="button button-dark" data-action="download-template">기록 양식 내려받기 ↓</button><button class="button button-outline" data-action="copy-template">양식 복사</button></div><details><summary style="cursor:pointer;margin-top:20px">작성 양식 미리 보기</summary><textarea id="record-template" readonly aria-label="경험 기록 작성 양식"></textarea></details>');
    $('#record-template').value = recordTemplate;
  }
  function openAbout() {
    showDialog('산경모아를 소개합니다.', '학생이 만드는 정보 공간 · 첫 공개 초안', '<p>산경모아는 인천대학교 산업경영공학과 재학생이 필요한 정보를 찾고, 구두로 전해지는 준비 경험을 기록으로 남기기 위해 시작한 학생 운영 프로젝트입니다.</p><h3>현재 제공하는 것</h3><ul><li>학사·졸업·장학·대회·취업 관련 공식 게시판과 안내 연결</li><li>공식 정보 검색·분류와 이 브라우저 안의 책갈피 저장</li><li>대회·취업 준비를 시작하는 편집 가이드와 경험 기록 양식</li></ul><h3>정보를 확인할 때</h3><p>인천대학교·학과의 공식 홈페이지가 아닙니다. 게시판 연결 경로는 2026년 10월 17일 확인했으며, 개별 공고를 실시간 수집하는 기능은 아직 없습니다. 모집 여부·마감·적용 요건은 공식 원문에서 확인해 주세요. 실제 선배 후기는 아직 등록되지 않았습니다.</p><h3>저장과 제보</h3><p>책갈피와 체크리스트는 현재 브라우저에만 저장되며 다른 기기로 동기화되지 않습니다. 브라우저 데이터 삭제 시 함께 지워질 수 있습니다. 개인 정보 입력이나 회원가입은 받지 않습니다. 호스팅·외부 글꼴 제공사의 접속 처리는 해당 서비스 정책을 따릅니다.</p><p>초안의 기능·링크 오류는 <a href="https://github.com/blue-sky-sailboat/blue-sky-sailboat.github.io/issues" target="_blank" rel="noopener noreferrer">GitHub Issues ↗</a>로 알려줄 수 있습니다. 공개되는 게시판이므로 개인 연락처·성적·비공개 경험 원문은 올리지 마세요. 비공개 기고 연락 경로는 준비 중입니다.</p><h3>공식 운영으로의 발전</h3><p>학생 시범 운영 후 학과와 협의할 계획입니다. 현재 학과의 공식 승인·추천을 받은 서비스는 아닙니다.</p>');
  }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.save) {
      const id = target.dataset.save;
      if (!data.resources.some((item) => item.id === id)) return;
      const removing = saved.has(id);
      removing ? saved.delete(id) : saved.add(id);
      const persisted = storage.write('sangyeong-saved-v1', [...saved]);
      renderList();
      const replacement = document.querySelector(`[data-save="${id}"]`);
      if (replacement) replacement.focus({ preventScroll: true });
      else $('#information-title').setAttribute('tabindex', '-1'), $('#information-title').focus({ preventScroll: true });
      toast(persisted ? removing ? '저장한 정보에서 해제했어요.' : '이 브라우저에 저장했어요.' : '브라우저 저장이 차단되어 이번 화면에서만 유지됩니다.');
    } else if (target.dataset.filter) {
      category = target.dataset.filter;
      if (route === 'home') { route = 'notices'; history.replaceState(null, '', '#notices'); $('#home-intro').hidden = true; $('#archive-section').hidden = true; $('#guide-section').hidden = true; }
      if (route === 'notices') history.replaceState(null, '', `#notices${category === 'all' ? '' : '/' + category}`);
      // 렌더링 후에도 선택한 필터에 키보드 초점을 유지합니다.
      const selected = category;
      renderRoute(false);
      category = selected;
      renderList();
      document.querySelector(`[data-filter="${selected}"]`).focus({ preventScroll: true });
    } else if (target.dataset.article) openArticle(target.dataset.article);
    else if (target.dataset.field) openField(target.dataset.field);
    else if (target.dataset.fieldSearch) {
      const field = data.fields.find((item) => item.id === target.dataset.fieldSearch);
      if (!field) return;
      hideDialog(); query = field.search; $('#site-search').value = query;
      if (location.hash === '#notices') renderRoute(); else location.hash = '#notices';
    } else if (target.dataset.action === 'about') openAbout();
    else if (target.dataset.action === 'contribute') openContribute();
    else if (target.dataset.action === 'reset') { query = ''; $('#site-search').value = ''; if (location.hash === '#notices') renderRoute(false); else location.hash = '#notices'; }
    else if (target.dataset.action === 'download-template') {
      const url = URL.createObjectURL(new Blob([recordTemplate], { type: 'text/markdown;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = '산경모아_경험기록_양식.md'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('작성 양식을 내려받았어요.');
    } else if (target.dataset.action === 'copy-template') {
      try { await navigator.clipboard.writeText(recordTemplate); toast('작성 양식을 복사했어요.'); }
      catch { const textarea = $('#record-template'); textarea.closest('details').open = true; textarea.focus(); textarea.select(); toast('양식을 선택했어요. Ctrl+C로 복사해 주세요.'); }
    }
  });
  document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-check]')) return;
    const id = event.target.dataset.check;
    event.target.checked ? checked.add(id) : checked.delete(id);
    const persisted = storage.write('sangyeong-checklist-v1', [...checked]);
    updateChecklistProgress();
    if (!persisted) toast('체크는 이번 화면에서만 유지됩니다.');
  });
  $('#search-form').addEventListener('submit', (event) => { event.preventDefault(); query = $('#site-search').value.trim(); if (location.hash === '#notices') renderRoute(); else location.hash = '#notices'; });
  $('#site-search').addEventListener('input', (event) => { query = event.target.value; if (route === 'notices' || route === 'saved') renderList(); });
  $('#site-search').addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.target.value = ''; query = ''; renderList(); } });
  document.addEventListener('keydown', (event) => { if (event.key === '/' && !dialog.open && !event.ctrlKey && !event.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#site-search').focus(); } });
  $('.skip-link').addEventListener('click', (event) => { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView({ block: 'start' }); });
  $('#dialog-close').addEventListener('click', hideDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) hideDialog(); } });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); hideDialog(); });
  window.addEventListener('hashchange', () => renderRoute());
  paintIcons(); renderArchive(); renderChecklist(); renderRoute(false);
})();
