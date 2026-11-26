import { redirect } from "next/navigation";

// 지난 게임은 게임 목록에 열린 방과 한 목록으로 합쳤다(#315). 예전 주소와 즐겨찾기는 게임 목록으로 보낸다
export default function GameHistoryListPage() {
  redirect("/admin/games");
}
