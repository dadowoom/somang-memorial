import MemorialDetailSimple from "@/components/MemorialDetailSimple";

const person = {
  name: "이순자",
  fullName: "故 이순자 권사",
  role: "소망교회 권사",
  church: "소망교회",
  dates: "1945 - 2024",
  photo:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_woman-VLyrQ8BXGGoAo339g3C8yL.webp",
  verse: "여호와는 나의 목자시니 내게 부족함이 없으리로다",
  verseRef: "시편 23:1",
  summary:
    "이순자 권사는 한결같은 기도와 환대로 가족과 교회 공동체를 섬겼습니다. 보이지 않는 자리에서 필요한 일을 살피며, 성도들에게 따뜻한 위로와 신앙의 본을 남겼습니다.",
  stats: [
    { label: "섬김", value: "55년" },
    { label: "직분", value: "권사" },
    { label: "공동체", value: "소망교회" },
  ],
  timeline: [
    {
      year: "1945",
      title: "출생",
      desc: "따뜻한 가정 안에서 신실한 마음을 배우며 성장했습니다.",
    },
    {
      year: "1972",
      title: "소망교회 등록",
      desc: "소망교회에서 예배와 봉사의 삶을 이어가기 시작했습니다.",
    },
    {
      year: "1991",
      title: "권사 임직",
      desc: "기도와 돌봄의 자리에서 교회 공동체를 섬겼습니다.",
    },
    {
      year: "2024",
      title: "하나님 품으로",
      desc: "믿음으로 걸어온 삶을 마치고 하나님의 위로 안에 머물게 되었습니다.",
    },
  ],
  messages: [
    {
      name: "가족",
      body: "어머니의 기도와 사랑을 마음 깊이 간직하겠습니다.",
    },
    {
      name: "교우",
      body: "늘 먼저 안부를 묻던 따뜻한 마음을 기억합니다.",
    },
    {
      name: "소망교회",
      body: "권사님의 조용한 섬김과 신앙의 발자취에 감사드립니다.",
    },
  ],
};

export default function MemorialDark() {
  return <MemorialDetailSimple person={person} />;
}
