/**
 * 입력 폼의 공용 스타일.
 *
 * 전에는 화면마다 같은 값을 각자 적어 두어, 한 곳만 고치면 화면끼리 모양이
 * 달라질 수밖에 없었다. 여기 한 곳에서 관리한다.
 *
 * 밑줄 대신 상자로 두는 이유: 추모관 등록처럼 채울 칸이 열 개가 넘는
 * 화면에서는 밑줄만으로 "여기에 쓰면 된다"는 것이 잘 보이지 않는다.
 *
 * 글씨를 16px(text-base)로 두는 이유: 아이폰 사파리는 입력 글씨가 16px보다
 * 작으면 칸을 누를 때 화면을 제멋대로 확대한다.
 */

const boxBase =
  "w-full border border-[#b5b0a7] bg-[#fafafa] text-base text-[#121212] outline-none transition-colors focus:border-[#18181b] focus:bg-white";

export const inputClass = `h-12 px-4 placeholder:text-[#9a9a9a] ${boxBase}`;

export const selectClass = `h-12 px-4 ${boxBase}`;

export const textAreaClass = `min-h-36 resize-y p-4 leading-7 placeholder:text-[#9a9a9a] ${boxBase}`;

export const labelClass = "mb-2 block text-sm font-medium text-[#3f3b36]";

export const errorClass = "mt-2 text-xs text-[#9f2a2a]";
