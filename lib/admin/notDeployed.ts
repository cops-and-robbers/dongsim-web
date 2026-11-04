/**
 * 운영 서버에 아직 없는 필드를 물었을 때 스키마 검사가 내는 오류인가.
 *
 * 백엔드가 dev 에 머지됐어도 main 에 나가기 전이면 운영에는 필드가 없다. 오류는 이렇게 온다(Relay 가 앞뒤로 글을 덧붙인다).
 * Validation error (FieldUndefined@[adminUser/gameHistories]) : Field 'gameHistories' in type 'AdminUser' is undefined
 *
 * 필드 이름까지 본다. 그래야 "x is undefined" 같은 다른 오류를 배포 전으로 착각해 "기다리면 돼요"라고 안내하지 않는다.
 */
export function isFieldNotDeployed(message: string, field: string): boolean {
  return message.includes(field) && /FieldUndefined|is undefined|Cannot query field|Unknown field/i.test(message);
}
