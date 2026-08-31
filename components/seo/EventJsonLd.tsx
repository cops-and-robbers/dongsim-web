import { isOpen, postPath, type CommunityPost } from "@/lib/community/api";
import { SITE_URL } from "@/lib/constants";

// 모집글을 schema.org/Event 로 알린다.
//
// 검색 결과에 날짜와 장소가 함께 뜨고, 끝난 모임은 eventStatus 로 구분된다.
// 지난 모임을 색인에서 빼지 않는 대신 이 표시로 "끝났다"를 알려, 검색으로 들어온
// 사람이 열린 모임인 줄 알고 왔다가 실망하는 일을 줄인다.
//
// 좌표는 넣되 정확한 집결 지점(placeName 안내)은 화면과 마찬가지로 넣지 않는다.

export default function EventJsonLd({ post }: { post: CommunityPost }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: post.title,
    description: post.content.slice(0, 300),
    startDate: post.meetingAt,
    eventStatus: isOpen(post)
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventCancelled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}${postPath(post)}`,
    maximumAttendeeCapacity: post.maxParticipants,
    location: {
      "@type": "Place",
      name: post.location.placeName,
      address: post.location.region ?? undefined,
      geo: {
        "@type": "GeoCoordinates",
        latitude: post.location.latitude,
        longitude: post.location.longitude,
      },
    },
    ...(post.writerNickname
      ? { organizer: { "@type": "Person", name: post.writerNickname } }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
