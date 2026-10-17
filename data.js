/* 공개해도 되는 자료만 넣으세요. 이 파일과 Git 변경 이력은 공개됩니다. */
window.SANGYEONG_DATA = {
  categories: [
    { id: 'all', label: '전체' },
    { id: 'scholarship', label: '장학금' },
    { id: 'activity', label: '대회·활동' },
    { id: 'academic', label: '학사' },
    { id: 'graduation', label: '졸업' },
    { id: 'career', label: '취업·진로' }
  ],
  resources: [
    { id: 'ime-scholarship', category: 'scholarship', title: '학과 장학 공지, 한곳에서 확인하기', description: '산업경영공학과의 장학 공지와 신청 안내를 확인하세요.', source: '산업경영공학과', type: '공식 게시판', url: 'https://www.inu.ac.kr/ime/3102/subview.do', checked: '2026.10.17', keywords: '근로 성적우수 학업우수 교내 교외 지원금 등록금' },
    { id: 'ime-activity', category: 'activity', title: '대회·프로그램·모집 소식 찾아보기', description: '학과 일반공지에서 경진대회, 비교과, 참여 프로그램을 찾아보세요.', source: '산업경영공학과', type: '공식 게시판', url: 'https://www.inu.ac.kr/ime/3100/subview.do', checked: '2026.10.17', keywords: '공모전 경진대회 프로젝트 동아리 활동 연구실 학부연구생' },
    { id: 'ime-academic', category: 'academic', title: '수강신청부터 학사 일정까지', description: '수강·전공·학적 관련 공지를 공식 게시판에서 확인하세요.', source: '산업경영공학과', type: '공식 게시판', url: 'https://www.inu.ac.kr/ime/3101/subview.do', checked: '2026.10.17', keywords: '학사 수업 시간표 복수전공 부전공 전공심화 학점 휴학 복학' },
    { id: 'ime-graduation', category: 'graduation', title: '졸업 준비, 나에게 적용되는 요건부터', description: '입학연도와 이수 상황에 맞는 기준은 학과의 공식 졸업요건에서 확인하세요.', source: '산업경영공학과', type: '공식 안내', url: 'https://www.inu.ac.kr/ime/3096/subview.do', checked: '2026.10.17', keywords: '졸업 학번 이수 요건 학점 인증 영어 논문' },
    { id: 'ime-career', category: 'career', title: '채용·인턴·취업 지원 소식 모아보기', description: '학과에 올라온 채용과 취업 준비 관련 공지를 확인하세요.', source: '산업경영공학과', type: '공식 게시판', url: 'https://www.inu.ac.kr/ime/3103/subview.do', checked: '2026.10.17', keywords: '취업 채용 인턴 직무 이력서 자기소개서 면접 진로' },
    { id: 'inu-scholarship', category: 'scholarship', title: '학교 전체 장학 공지도 함께 챙기기', description: '대학 본부의 교내·교외·국가 장학 관련 공지를 확인하세요.', source: '인천대학교', type: '공식 게시판', url: 'https://www.inu.ac.kr/inu/1519/subview.do', checked: '2026.10.17', keywords: '국가 장학금 한국장학재단 교내 교외 생활비 신청' },
    { id: 'ime-curriculum', category: 'academic', title: '전공 수업의 흐름 살펴보기', description: '교육과정 원문에서 전공 과목과 이수 구성을 확인하세요.', source: '산업경영공학과', type: '공식 안내', url: 'https://www.inu.ac.kr/ime/3093/subview.do', checked: '2026.10.17', keywords: '수업 교육과정 과목 전공 로드맵 진로 학년 데이터 분석 생산 품질 물류 최적화' },
    { id: 'inu-scholarship-guide', category: 'scholarship', title: '교내장학금 종류와 기본 기준 알아보기', description: '제도 안내를 읽은 뒤, 실제 신청기간과 조건은 해당 학기 공고를 확인하세요.', source: '인천대학교', type: '공식 안내', url: 'https://www.inu.ac.kr/inu/560/subview.do', checked: '2026.10.17', keywords: '장학금 지급 기준 종류 생활비 등록금 성적' }
  ],
  articles: [
    { id: 'competition', category: '경진대회 준비', title: '첫 경진대회,<br>무엇부터 준비할까?', description: '대회 찾기부터 팀 구성, 결과물 정리까지.<br>처음 도전할 때 확인할 질문들을 모았어요.', icon: 'flag', art: '', kicker: 'START WITH A QUESTION', read: '준비 체크리스트 · 3단계', intro: '특정 대회의 수상 후기 대신, 첫 준비를 시작할 때 사용할 수 있는 편집 가이드입니다. 참가 조건과 평가 기준은 반드시 해당 대회 원문에서 확인하세요.', sections: [
      { title: '01. 대회보다 먼저, 해결할 문제', items: ['관심 분야와 참여 목적을 적어보세요. 수업에서 배운 것을 적용하고 싶은지, 팀 프로젝트 경험이 필요한지 구분해요.', '모집요강의 참가 대상, 팀 인원, 제출물, 평가 기준과 일정을 확인해요.', '공고 마감과 실제 작업 기간을 달력에 나란히 놓고 참여 가능 여부를 판단해요.'] },
      { title: '02. 팀의 역할과 작은 일정', items: ['자료 조사, 분석·개발, 결과 정리, 발표 등 필요한 일을 적고 역할을 나눠요.', '최종 제출일부터 거꾸로 초안·검토·수정일을 정해요.', '첫 회의에서는 작은 결과물 하나와 다음 회의 때 확인할 것을 정해요.'] },
      { title: '03. 결과와 과정을 함께 남기기', items: ['가설, 사용한 자료, 시도한 방법, 바꾼 이유를 간단히 기록해요.', '제출 전 파일 형식·분량·제출 경로를 모집요강과 다시 대조해요.', '끝난 뒤 잘된 점과 다시 한다면 바꿀 점을 남겨요. 팀원 동의와 자료 공개 범위를 확인한 뒤 공유해요.'] }
    ] },
    { id: 'career', category: '취업 준비', title: '막막한 취업 준비,<br>나의 경험부터 펼쳐보기', description: '직무를 알아보고, 경험을 정리하고.<br>오늘 시작할 수 있는 작은 준비를 찾아요.', icon: 'bag', art: 'career-art', kicker: 'CONNECT YOUR EXPERIENCE', read: '경험 정리 가이드 · 3단계', intro: '개인의 합격 경험이나 특정 기업의 채용 기준이 아닌, 자신의 준비 과정을 정리하기 위한 편집 가이드입니다.', sections: [
      { title: '01. 관심 있는 일의 언어 찾기', items: ['관심 직무의 채용 공고를 읽고 반복해서 등장하는 업무와 역량을 적어봐요.', '생산·품질, 물류, 데이터 분석 등 이름보다 실제 하는 일을 비교해요.', '기업·직무·채용 시기마다 요건이 다르므로 현재 공고의 필수·우대 조건을 구분해요.'] },
      { title: '02. 내가 해본 일을 구체적으로', items: ['수업, 팀 프로젝트, 대회, 아르바이트 등 경험을 빠짐없이 적어봐요.', '각 경험에서 문제, 내 역할, 선택한 방법, 결과, 배운 점을 정리해요.', '숫자로 설명할 수 있는 결과는 근거와 함께 남기고, 없었던 성과를 만들어 쓰지 않아요.'] },
      { title: '03. 다음 행동은 하나씩', items: ['부족한 역량 하나를 고르고 이번 달에 할 작은 활동을 정해요.', '이력서·포트폴리오는 지원 직무에 연결되는 경험부터 검토해요.', '지원 기록과 면접 질문을 남겨 다음 준비에 활용해요. 다른 사람에게 공개할 때는 기업·개인·비공개 자료의 공개 범위를 확인해요.'] }
    ] }
  ],
  fields: [
    { id: 'data', title: '데이터·의사결정', description: '데이터로 문제를 읽고<br>더 나은 선택을 설계하기', question: '데이터에서 어떤 판단을 이끌어낼 수 있을까?', body: '자료를 수집하고 비교하며, 가설과 분석 결과를 의사결정으로 연결하는 문제에 관심이 있다면 살펴보세요.', activities: ['공개 데이터로 질문 하나를 정하고 분석해 보기', '분석 결과의 근거와 한계를 짧은 보고서로 설명하기', '관련 교과목과 프로젝트를 공식 교육과정에서 확인하기'], search: '데이터' },
    { id: 'production', title: '생산·품질', description: '과정 속 문제를 발견하고<br>더 나은 시스템 만들기', question: '같은 자원으로 과정을 더 잘 운영할 수 있을까?', body: '작업 흐름, 품질, 대기와 낭비를 관찰하고 개선하는 문제에 관심이 있다면 살펴보세요.', activities: ['주변 서비스나 작업의 흐름을 그림으로 정리하기', '불편이나 대기가 생기는 지점을 관찰해 개선안 제안하기', '개선 전후를 비교할 기준을 먼저 정해 보기'], search: '프로젝트' },
    { id: 'logistics', title: '물류·공급망', description: '사람과 물자의 흐름을<br>효율적으로 연결하기', question: '필요한 것을 적절한 곳에 연결하려면?', body: '재고·운송·공급망의 흐름과 제약을 함께 고려하는 문제에 관심이 있다면 살펴보세요.', activities: ['재고나 배송의 간단한 사례에서 목표와 제약 구분하기', '여러 대안을 같은 기준으로 비교해 보기', '물류와 공급망을 다루는 대회·프로젝트의 공고 확인하기'], search: '대회' }
  ],
  checklist: [
    { id: 'scholarship', label: '장학 공지와 신청기간 확인' },
    { id: 'graduation', label: '내 학번의 졸업요건 확인' },
    { id: 'experience', label: '이번 학기 도전 하나 정하기' }
  ]
};
