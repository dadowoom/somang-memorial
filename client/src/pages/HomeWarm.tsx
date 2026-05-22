import MemorialDetailSimple from "@/components/MemorialDetailSimple";

const person = {
  name: "김영수",
  fullName: "故 김영수 장로",
  role: "소망교회 원로장로",
  church: "소망교회",
  dates: "1938 - 2024",
  photo:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663470178900/Mgh5Mk5AAaqsycpXA9tc7E/memorial_elder_man-EoYUBTXnk59Sfrj2gmtSED.webp",
  verse: "내가 선한 싸움을 싸우고 나의 달려갈 길을 마치고",
  verseRef: "디모데후서 4:7",
  summary:
    "김영수 장로는 오랜 시간 소망교회 공동체를 섬기며 조용하고 성실한 믿음의 길을 걸었습니다. 예배와 기도, 이웃을 향한 섬김을 삶의 중심에 두었고, 가족과 성도들에게 신실한 신앙의 기억을 남겼습니다.",
  stats: [
    { label: "섬김", value: "40년" },
    { label: "직분", value: "장로" },
    { label: "공동체", value: "소망교회" },
  ],
  timeline: [
    {
      year: "1938",
      title: "출생",
      desc: "서울에서 태어나 가족의 사랑 안에서 성장했습니다.",
    },
    {
      year: "1965",
      title: "소망교회 등록",
      desc: "소망교회 공동체와 함께 신앙생활을 시작했습니다.",
    },
    {
      year: "1998",
      title: "장로 임직",
      desc: "성도들의 신뢰 속에서 장로로 임직하여 교회를 섬겼습니다.",
    },
    {
      year: "2024",
      title: "하나님 품으로",
      desc: "평생 지켜온 믿음의 여정을 마치고 하나님의 품에 안겼습니다.",
    },
  ],
  messages: [
    {
      name: "가족",
      body: "늘 조용히 기도하시던 모습을 오래 기억하겠습니다.",
    },
    {
      name: "교우",
      body: "교회를 향한 섬김과 따뜻한 마음에 깊이 감사드립니다.",
    },
    {
      name: "소망교회",
      body: "믿음의 길을 함께 걸어주신 장로님의 삶을 기억합니다.",
    },
  ],
};

export default function HomeWarm() {
  return <MemorialDetailSimple person={person} />;
}
