import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Link } from "wouter";

/**
 * 주소를 잘못 눌렀거나 지워진 추모관에 들어왔을 때 보는 화면입니다.
 *
 * 여기까지 오신 분은 대개 무언가를 찾다가 길을 잃은 것이므로,
 * 사과보다 다음에 갈 곳을 알려드리는 편이 낫습니다.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[560px] flex-col px-6 pb-24 pt-28 sm:pt-36">
        <p className="text-xs font-medium tracking-[0.18em] text-[#8a8a8a]">
          NOT FOUND
        </p>
        <h1 className="mt-5 text-[30px] font-light leading-tight text-[#121212]">
          찾으시는 페이지가 없습니다
        </h1>
        <p className="mt-6 text-sm leading-7 text-[#616161]">
          주소가 잘못되었거나, 추모관이 옮겨졌을 수 있습니다.
          <br />
          아래에서 원하시는 곳으로 이동해 주세요.
        </p>

        <div className="mt-12 flex flex-col gap-3">
          <Link
            href="/memorial/search"
            className="flex h-12 items-center justify-center bg-[#18181b] text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            추모관 찾기
          </Link>
          <Link
            href="/"
            className="flex h-12 items-center justify-center border border-[#dbdad7] bg-white text-sm font-medium text-[#616161] transition-colors hover:border-[#18181b] hover:text-[#121212]"
          >
            처음 화면으로
          </Link>
        </div>

        <p className="mt-10 text-xs leading-6 text-[#8a8a8a]">
          찾으시던 분의 추모관이 보이지 않는다면, 아직 준비 중이거나 가족만 볼
          수 있도록 설정된 것일 수 있습니다.
        </p>
      </main>
      <Footer />
    </div>
  );
}
