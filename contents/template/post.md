# IME Hub – 포스터 콘텐츠 템플릿 `post.md` (JSON 작성 규격)

> 목적: 이 문서는 **포스터 카드/상세**를 구동하는 **JSON 데이터 파일**을 만들기 위한 표준 템플릿입니다. 실제 게시물은 **`contents/post/*.json`**에 저장됩니다. 이 문서(`post.md`)는 각 항목을 생성할 때 **필수/선택 필드, 스키마, 네이밍 규칙, 검수 체크리스트**를 제공하는 가이드입니다.

---

## 0) 디렉토리 & 네이밍 규칙

```
ime-hub/
└─ contents/
   ├─ template/
   │  └─ post.md              # ← 바로 이 파일 (작성 가이드)
   └─ post/
      ├─ 2025-11-02-ime-scholarship.json
      ├─ 2025-11-04-ml-bootcamp.json
      └─ 2025-11-07-intern-abc.json
```

- **파일명 규칙**: `YYYY-MM-DD-<slug>.json`  
  - `YYYY-MM-DD`: 게시 기준일(수집일)  
  - `<slug>`: 소문자, `a-z0-9-`만 사용. 공백은 `-`로 치환, 한글은 영문 키워드로 요약 권장  
- 한 항목 = 한 JSON 파일. 중복 스크랩 시 **같은 slug** 유지 + 날짜만 갱신

---

## 1) 공통 스키마 (모든 타입 공통)

```json
{
  "id": "ime-2025-11-02-0001",
  "type": "scholarship",         // enum: scholarship | activity | job | grad | event | notice
  "title": "2025 겨울학기 IME 장학 프로그램",
  "subtitle": "GPA 3.2+ / 재학생 / 마감 2025-11-20",
  "tags": ["장학", "학부", "재학생"],
  "date_published": "2025-11-02",    // YYYY-MM-DD (게시/수집 기준일)
  "deadline": "2025-11-20",          // YYYY-MM-DD (없으면 빈 문자열 "")
  "last_checked_at": "2025-11-02",   // YYYY-MM-DD (원문 재확인일)
  "source_name": "IME Hub 스크랩",
  "source_url": "https://example.com/scholarship",
  "hero_image": "/assets/images/sample.jpg",   // 선택, 없으면 생략
  "payload": { /* 타입별 상세 필드 (아래 2)참조) */ }
}
```

**제약(공통):**
- 모든 날짜는 **`YYYY-MM-DD`** (UTC 기준으로 하루 단위만 사용)
- `source_url`은 **https://** 필수, UTM 파라미터 제거
- `tags`는 **소문자/한글 혼용 가능**, 공백 대신 하이픈 금지 → 다중 단어는 배열로 분리
- 금액/숫자 필드는 **정수(원화 기준)** 또는 명시 단위(만원) → 내부 규칙: 정수(₩) 권장
- **PII 금지**(개인 연락처/주민번호 등). 담당자명은 기관명으로 대체

---

## 2) 타입별 `payload` 스키마

### 2-1) `scholarship` (장학)
```json
"payload": {
  "amount_max": 1200000,             // 최대 지원 금액(원)
  "eligible_years": [2,3,4],         // 학년 (1~6)
  "gpa_min": 3.2,                    // 0.0~4.5
  "income_bracket_max": 8,           // 선택 (1~10)
  "major": "산업경영공학",
  "region": "인천",
  "requirements": [
    "학부연구생(URP) 참여 경험 또는 계획",
    "공모전·대회 참여 실적(증빙 제출)"
  ],
  "documents": [
    "지원서(소정 양식)",
    "성적증명서",
    "재학증명서",
    "개인정보 수집·이용 동의서"
  ],
  "apply_steps": [
    "양식 다운로드 및 작성",
    "서류 PDF 병합 업로드",
    "접수번호 보관"
  ],
  "notes": [
    "마감 이후 접수 불가",
    "이중 수혜 제한 가능"
  ]
}
```

### 2-2) `activity` (대외활동/교육/부트캠프)
```json
"payload": {
  "organization": "ABC 재단",
  "period": "2025-12-01 ~ 2026-02-28",
  "location": "온라인/오프라인(서울)",
  "benefits": ["수료증", "소정의 활동비"],
  "requirements": ["재학생", "기초 파이썬 가능"],
  "selection": ["서류", "과제", "인터뷰"],
  "contacts": ["apply@example.org"]
}
```

### 2-3) `job` (채용/인턴)
```json
"payload": {
  "company": "Acme Corp",
  "role": "Data Analyst Intern",
  "location": "송도, 인천",
  "employment_type": "internship",     // enum: fulltime | internship | contract | parttime
  "salary_min": 2500000,
  "salary_max": 3200000,
  "apply_url": "https://company.example/jobs/123",
  "requirements": ["SQL", "Python", "기초 통계"],
  "nice_to_have": ["Tableau", "OR-Tools"]
}
```

### 2-4) `grad` (대학원/입시/RA·TA)
```json
"payload": {
  "university": "Incheon National University",
  "program": "Industrial & Management Engineering MS",
  "round": "2026 Spring 1차",
  "tuition_per_semester": 2200000,
  "stipend": "월 80만원 (RA/TA, 과제 연동)",
  "contact": "lab@example.edu"
}
```

---

## 3) 예시 JSON (장학)

```json
{
  "id": "ime-2025-11-02-0001",
  "type": "scholarship",
  "title": "2025 겨울학기 IME 장학 프로그램",
  "subtitle": "GPA 3.2+ / 재학생 / 마감 2025-11-20",
  "tags": ["장학", "학부", "재학생"],
  "date_published": "2025-11-02",
  "deadline": "2025-11-20",
  "last_checked_at": "2025-11-02",
  "source_name": "IME Hub 스크랩",
  "source_url": "https://example.com/scholarship",
  "hero_image": "/assets/images/sample.jpg",
  "payload": {
    "amount_max": 1200000,
    "eligible_years": [2,3,4],
    "gpa_min": 3.2,
    "income_bracket_max": 8,
    "major": "산업경영공학",
    "region": "인천",
    "requirements": [
      "학부연구생(URP) 참여 경험 또는 계획",
      "공모전·대회 참여 실적(증빙 제출)"
    ],
    "documents": [
      "지원서(소정 양식)",
      "성적증명서",
      "재학증명서",
      "개인정보 수집·이용 동의서"
    ],
    "apply_steps": [
      "양식 다운로드 및 작성",
      "서류 PDF 병합 업로드",
      "접수번호 보관"
    ],
    "notes": [
      "마감 이후 접수 불가",
      "이중 수혜 제한 가능"
    ]
  }
}
```

---

## 4) 검증 (zod / JSON Schema)

### 4-1) zod (TypeScript)
```ts
import { z } from "zod";

export const CommonSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["scholarship", "activity", "job", "grad", "event", "notice"]),
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  date_published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  last_checked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source_name: z.string().min(1),
  source_url: z.string().url().startsWith("https://"),
  hero_image: z.string().optional(),
  payload: z.record(z.any())
});

export const ScholarshipPayload = z.object({
  amount_max: z.number().int().nonnegative(),
  eligible_years: z.array(z.number().int().min(1).max(6)).nonempty(),
  gpa_min: z.number().min(0).max(4.5),
  income_bracket_max: z.number().int().min(1).max(10).optional(),
  major: z.string().optional(),
  region: z.string().optional(),
  requirements: z.array(z.string()).default([]),
  documents: z.array(z.string()).default([]),
  apply_steps: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});
```

### 4-2) JSON Schema (Draft-07)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id","type","title","date_published","last_checked_at","source_name","source_url","payload"],
  "properties": {
    "id": {"type": "string", "minLength": 1},
    "type": {"type": "string", "enum": ["scholarship","activity","job","grad","event","notice"]},
    "title": {"type": "string", "minLength": 1},
    "subtitle": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}},
    "date_published": {"type": "string", "pattern": "^\d{4}-\d{2}-\d{2}$"},
    "deadline": {"type": "string", "pattern": "^$|^\d{4}-\d{2}-\d{2}$"},
    "last_checked_at": {"type": "string", "pattern": "^\d{4}-\d{2}-\d{2}$"},
    "source_name": {"type": "string", "minLength": 1},
    "source_url": {"type": "string", "pattern": "^https://"},
    "hero_image": {"type": "string"},
    "payload": {"type": "object"}
  },
  "additionalProperties": false
}
```

---

## 5) 생성 규칙 (권장)

- **id 생성**: `ime-<YYYY-MM-DD>-<4자리증가번호>` 또는 `slug` 기반 해시(충돌 방지).  
- **slug 규칙**: 영문 소문자/숫자/하이픈만. 한글은 핵심 키워드 영문화.  
- **정렬 우선순위**: 기본 `deadline` 오름차순 → `date_published` 내림차순 보조.  
- **파생값**: `D-DAY`는 UI 단에서 `deadline`으로 계산(마감 없으면 표시 생략).  
- **링크 안전성**: `source_url`은 리다이렉트/단축링크 해제 후 최종 원문으로 저장.  
- **중복 방지**: 같은 원문이면 **같은 slug** 유지 + `last_checked_at`만 갱신.  
- **비고**: 스크랩 시 스팸/사설 교육/유료 상술성 공고는 제외(내부 가이드 참고).

---

## 6) 작성 체크리스트

- [ ] 파일명 `YYYY-MM-DD-<slug>.json` 규칙 준수  
- [ ] `title / type / source_url / date_published / last_checked_at` 채움  
- [ ] 날짜는 모두 `YYYY-MM-DD` 형식  
- [ ] `source_url`이 https 원문인지 확인(단축/광고 링크 제거)  
- [ ] `payload` 타입별 필수 필드 채움  
- [ ] 금액/숫자 단위(원/정수) 일치  
- [ ] 민감정보(PII) 포함 여부 점검  
- [ ] 로컬 zod/JSON Schema 검증 통과  
- [ ] UI에서 카드/상세가 정상 표시되는지 미리보기 확인  

---

## 7) 워크플로 (요약)

1. **스크랩**: 원문 URL, 마감일, 핵심 요건/혜택 수집  
2. **정규화**: 날짜 형식/금액 단위 통일, slug 생성  
3. **작성**: `contents/post/날짜-슬러그.json` 생성 후 공통 + 타입별 `payload` 입력  
4. **검증**: zod/JSON Schema 통과, 링크 유효성 확인  
5. **커밋/푸시**: GitHub Pages 자동 반영 → 리스트/상세에서 확인  
6. **유지보수**: 마감 임박/변경 발생 시 `last_checked_at` 갱신, 필요 시 payload 보완  

---

## 8) 버전

- 2025-11-02 v1.0 — 최초 작성 (공통/타입별 payload, zod & JSON Schema 포함)
