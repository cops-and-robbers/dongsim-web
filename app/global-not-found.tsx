import RootDocument, { rootMetadata } from "@/app/_root/RootDocument";
import NotFoundScreen from "@/app/_root/NotFoundScreen";

// 어떤 라우트에도 없는 주소의 404다. 루트 레이아웃이 언어마다 따로라(#301)
// 레이아웃 하나로 감쌀 수 없어서 문서 껍데기를 직접 그린다.
// 서버는 주소를 모르니 lang 은 ko 로 내고, LocaleProvider 가 주소를 보고 맞춘다.
// notFound() 로 오는 404는 각 언어 묶음의 not-found.tsx 가 받는다.

export const metadata = rootMetadata;

export default function GlobalNotFound() {
  return (
    <RootDocument lang="ko">
      <NotFoundScreen />
    </RootDocument>
  );
}
