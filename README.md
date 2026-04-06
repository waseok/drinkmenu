# 와석초 음료 주문 시스템

와석초등학교 교직원 음료 주문 취합 웹 애플리케이션입니다.

## 주요 기능

- **업체/메뉴 관리**: 네이버 플레이스에서 업체 검색 + 메뉴 자동 크롤링 + 수동 등록
- **교직원 관리**: 엑셀 파일(.xlsx) 업로드로 교직원 일괄 등록
- **주문 세션**: 제목/날짜/업체를 지정하여 주문 세션 생성
- **음료 주문**: 선생님들이 링크로 접속하여 음료 선택
- **결과 출력**: 주문 요약 테이블, 이미지 저장, 인쇄, 클립보드 복사

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL (Supabase)
- 네이버 플레이스 크롤링 (업체 검색 + 메뉴 자동 수집)

## 사전 준비

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 무료 계정 생성
2. 새 프로젝트 생성
3. Settings > Database > Connection string (URI)에서 연결 URL 복사

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다:

```env
DATABASE_URL="postgresql://postgres:비밀번호@db.프로젝트ID.supabase.co:5432/postgres"
```

## 로컬 개발

```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## Vercel 배포

1. GitHub에 코드 푸시
2. [vercel.com](https://vercel.com)에서 프로젝트 연결
3. Environment Variables에 `DATABASE_URL` 추가
4. 배포

### Vercel 빌드 설정

Build Command는 기본값 그대로 사용합니다. Prisma generate는 `postinstall` 스크립트로 자동 실행되도록 아래와 같이 설정합니다:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## 사용 방법

### 관리자

1. `/admin`에서 관리자 대시보드 접속
2. **교직원 관리**: 엑셀 파일 업로드 또는 수동 등록
3. **업체/메뉴 관리**: 주변 카페 검색 후 추가, 메뉴 입력
4. **주문 세션 생성**: 제목, 날짜, 대상 업체 선택
5. 생성된 주문 링크를 선생님들에게 공유

### 선생님

1. 공유받은 링크로 접속
2. 본인 이름 선택
3. 원하는 음료 선택
4. 주문 완료

### 결과 확인

- `/order/세션ID/result`에서 주문 결과 확인
- 이미지 저장, 인쇄, 클립보드 복사 가능

## 페이지 구조

```
/                         - 메인 페이지
/admin                    - 관리자 대시보드
/admin/staff              - 교직원 관리
/admin/shops              - 업체/메뉴 관리
/admin/sessions           - 주문 세션 관리
/order                    - 진행 중인 주문 목록
/order/[sessionId]        - 음료 주문 페이지
/order/[sessionId]/result - 주문 결과
```
