// tz-lookup 은 타입 선언이 없다. 좌표를 IANA 시간대 문자열로 바꾸는 함수 하나뿐이다.
declare module "tz-lookup" {
  export default function tzlookup(latitude: number, longitude: number): string;
}
