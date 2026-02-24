# LocationGuide 이미지 업로드 환경변수 가이드 (S3 직접 업로드)

## 대상
- API 서버 (`/Users/luke/Documents/leaders-erp/apps/api`)

## 필수/선택 변수
- `AWS_REGION` (필수)
  - S3 버킷 리전 (예: `ap-northeast-2`)
- `AWS_ACCESS_KEY_ID` (필수)
- `AWS_SECRET_ACCESS_KEY` (필수)
- `S3_BUCKET` (필수)
  - 이미지 업로드 대상 버킷명
- `S3_KEY_PREFIX` (선택)
  - 동일 버킷 내 환경 분리용 디렉터리 prefix
  - 예: `dev`, `prd`
  - 최종 키 예: `korea-erp/dev/20260224/...`
- `AWS_SESSION_TOKEN` (선택)
  - 임시 자격증명(STS) 사용하는 경우만 필요
- `S3_PUBLIC_BASE_URL` (선택)
  - 미설정 시: `https://<bucket>.s3.<region>.amazonaws.com/<key>` 형태 저장
  - 설정 시: `<S3_PUBLIC_BASE_URL>/<key>` 형태 저장
- `S3_UPLOAD_TIMEOUT_MS` (선택, 기본값 `15000`)

## 어디서 받아오나
1. `AWS_REGION`, `S3_BUCKET`
   - AWS 콘솔 S3 버킷 설정
   - `S3_KEY_PREFIX`는 팀 환경 규칙(dev/prd)에 맞춰 애플리케이션 설정에서 결정
2. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
   - IAM 사용자/역할 자격증명 (보안팀/인프라 담당 경로)
3. `S3_PUBLIC_BASE_URL`
   - S3 기본 퍼블릭 URL 사용 시 불필요

## 버킷 권한 전제
- CloudFront 없이 직접 노출하려면 버킷 정책으로 `GetObject` 공개 허용이 필요
- 업로드 권한은 API 서버 IAM 자격증명에 `s3:PutObject` 권한 필요

## 적용 방법
1. 루트 `/Users/luke/Documents/leaders-erp/.env.example` 참고
2. 실제 `.env`에 값 반영
3. API 서버 재시작

## 확인 포인트
- `createLocationGuide`, `updateLocationGuide` 업로드 성공
- DB `LocationGuide.imageUrls`에 S3 URL 저장
- 저장된 URL 직접 접근 시 이미지 로딩 가능
