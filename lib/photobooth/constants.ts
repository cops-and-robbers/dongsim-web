// 포토부스 저장소 상수 (#123).
// 사진은 팀 Cloudflare 계정의 R2 photobooth 버킷에 저장한다. 일회성 파일이라
// 커스텀 도메인 없이 r2.dev 공개 URL로 서빙하고, 버킷의 Object Lifecycle Rule이
// 업로드 7일 뒤 자동 삭제한다 - 코드에 정리 로직이 없는 이유.
export const PHOTOBOOTH_PUBLIC_BASE =
  "https://pub-44b0dce15a98439d944371f26142e760.r2.dev";

/** 업로드 키 형태 - /p?k= 로 받은 값을 URL로 되살리기 전에 이 형태인지 검증한다. */
export const PHOTOBOOTH_KEY_RE = /^strips\/[A-Za-z0-9-]+\.jpg$/;
