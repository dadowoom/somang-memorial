import { compressImageFile } from "@/lib/imageCompression";
import { toImgUrl } from "@/lib/imageUrl";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { MutableRefObject, ReactElement } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { useIsMobile } from "@/hooks/useMobile";
import { bookReaderFrameWidth } from "@/lib/bookReaderLayout";
import { toast } from "sonner";

type BookPage = {
  id: number;
  bookId: number;
  title: string | null;
  content: string | null;
  photoUrl: string | null;
  photoKey: string | null;
  dateYear: number | null;
  dateMonth: number | null;
  dateDay: number | null;
  sortOrder: number;
};

type MemorialBook = {
  id: number;
  memorialId: number;
  title: string;
  subtitle: string | null;
  coverPhotoUrl: string | null;
  publishedYear: string | null;
  pages: BookPage[];
};

type MemorialBookSectionProps = {
  memorialId: number;
  isAdmin: boolean;
  accessToken?: string;
};

type ViewMode = "book" | "timeline";

const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";

function formatDate(
  year?: number | null,
  month?: number | null,
  day?: number | null
) {
  if (!year) return "";
  if (month && day) return `${year}년 ${month}월 ${day}일`;
  if (month) return `${year}년 ${month}월`;
  return `${year}년`;
}

function sortPages(pages: BookPage[]) {
  return [...pages].sort((a, b) => {
    const yearDiff = (a.dateYear ?? 9999) - (b.dateYear ?? 9999);
    if (yearDiff !== 0) return yearDiff;
    const monthDiff = (a.dateMonth ?? 0) - (b.dateMonth ?? 0);
    if (monthDiff !== 0) return monthDiff;
    const dayDiff = (a.dateDay ?? 0) - (b.dateDay ?? 0);
    if (dayDiff !== 0) return dayDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

const ContentPage = forwardRef<
  HTMLDivElement,
  { page: BookPage; pageIndex?: number }
>(function ContentPage({ page, pageIndex }, ref) {
    const date = formatDate(page.dateYear, page.dateMonth, page.dateDay);
    return (
      <div
        ref={ref}
        data-page-index={pageIndex}
        className="relative flex h-full flex-col overflow-hidden bg-[#fdfdfd] p-6 md:p-8"
      >
        {date && (
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#666666]">
            {date}
          </p>
        )}
        {page.photoUrl && (
          <div className="mb-4 h-[38%] shrink-0 overflow-hidden border border-[#dedede]">
            <img
              src={toImgUrl(page.photoUrl)}
              alt={page.title || date || "기록 사진"}
              className="h-full w-full object-cover"
              style={{ filter: memorialPhotoFilter }}
            />
          </div>
        )}
        {page.title && (
          <h4
            className="mb-3 text-xl font-light leading-snug text-[#171717]"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {page.title}
          </h4>
        )}
        {page.content && (
          <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-8 text-[#555555]">
            {page.content}
          </p>
        )}
      </div>
    );
  }
);

const EndPage = forwardRef<HTMLDivElement, { pageIndex?: number }>(
  function EndPage({ pageIndex }, ref) {
  return (
    <div
      ref={ref}
      data-page-index={pageIndex}
      className="flex h-full flex-col items-center justify-center bg-[#fdfdfd] p-8 text-center"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-[#666666]">
        Soli Deo Gloria
      </p>
      <p
        className="mt-5 text-2xl font-light text-[#171717]"
        style={{ fontFamily: "'Noto Serif KR', serif" }}
      >
        오직 하나님께 영광
      </p>
    </div>
  );
});

const BlankPage = forwardRef<HTMLDivElement, { pageIndex?: number }>(
  function BlankPage({ pageIndex }, ref) {
    return (
      <div
        ref={ref}
        data-page-index={pageIndex}
        className="h-full bg-[#fdfdfd]"
      />
    );
  }
);

export default function MemorialBookSection({
  memorialId,
  isAdmin,
  accessToken,
}: MemorialBookSectionProps) {
  const utils = trpc.useUtils();
  const bookRef = useRef<any>(null);
  const listInput = { memorialId, accessToken: accessToken || undefined };
  const booksQuery = trpc.book.listByMemorial.useQuery(listInput);
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("book");
  // 책을 펼치기 전에는 표지만 보여준다.
  const [bookOpened, setBookOpened] = useState(false);
  const [addingBook, setAddingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [editingPage, setEditingPage] = useState<
    (Partial<BookPage> & { bookId: number }) | null
  >(null);

  const allBooks = (booksQuery.data ?? []) as MemorialBook[];
  const books = isAdmin
    ? allBooks
    : allBooks.filter(book => book.pages.length > 0);
  const selectedBook =
    books[Math.min(selectedBookIndex, Math.max(books.length - 1, 0))];
  const sortedPages = useMemo(
    () => (selectedBook ? sortPages(selectedBook.pages) : []),
    [selectedBook]
  );

  const createBook = trpc.book.create.useMutation({
    onSuccess: () => {
      toast.success("책이 추가되었습니다.");
      setAddingBook(false);
      setNewBookTitle("");
      utils.book.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });
  const deleteBook = trpc.book.delete.useMutation({
    onSuccess: () => {
      toast.success("책이 삭제되었습니다.");
      setSelectedBookIndex(0);
      utils.book.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });
  const addPage = trpc.book.addPage.useMutation({
    onSuccess: () => {
      toast.success("페이지가 추가되었습니다.");
      setEditingPage(null);
      utils.book.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });
  const updatePage = trpc.book.updatePage.useMutation({
    onSuccess: () => {
      toast.success("저장되었습니다.");
      setEditingPage(null);
      utils.book.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });
  const deletePage = trpc.book.deletePage.useMutation({
    onSuccess: () => {
      toast.success("페이지가 삭제되었습니다.");
      utils.book.listByMemorial.invalidate(listInput);
    },
    onError: error => toast.error(error.message),
  });

  const flipPages = useMemo(() => {
    if (!selectedBook) return [];
    // 표지는 책 밖에서 한 장으로 꽉 차게 보여준다. 책 안에 두면 펼침 보기에서
    // 왼쪽 절반이 빈 종이로 남아 고장난 화면처럼 보인다.
    const pages = [
      ...sortedPages.map((page, index) => (
        <ContentPage key={page.id} page={page} pageIndex={index} />
      )),
      <EndPage key="end" pageIndex={sortedPages.length} />,
    ];
    if (pages.length % 2 !== 0)
      pages.push(<BlankPage key="blank" pageIndex={pages.length} />);
    return pages;
  }, [selectedBook, sortedPages]);

  if (!booksQuery.isLoading && books.length === 0 && !isAdmin) return null;

  return (
    <section className="border-t border-[#dedede] bg-white py-20 md:py-28">
      <div className="container">
        <div className="memorial-section-heading">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#666666]">
            The Book Of Faith
          </p>
          <h2
            className="text-balance break-keep text-3xl font-light [overflow-wrap:anywhere] md:text-4xl"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            책장과 연표
          </h2>
          <p className="mt-4 text-pretty break-keep text-sm leading-7 text-[#666666] [overflow-wrap:anywhere]">
            페이지마다 날짜와 사진, 이야기를 담아 더 깊은 기록을 남깁니다.
          </p>
        </div>

        {books.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex border border-[#dedede] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("book")}
                className={`inline-flex h-9 items-center gap-2 px-4 text-xs ${
                  viewMode === "book"
                    ? "bg-[#171717] text-white"
                    : "text-[#555555]"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                책장 보기
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`inline-flex h-9 items-center gap-2 px-4 text-xs ${
                  viewMode === "timeline"
                    ? "bg-[#171717] text-white"
                    : "text-[#555555]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                연표 보기
              </button>
            </div>
          </div>
        )}

        {books.length > 1 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {books.map((book, index) => (
              <button
                key={book.id}
                type="button"
                onClick={() => {
                  setSelectedBookIndex(index);
                  setCurrentPage(0);
                }}
                className={`border px-4 py-2 text-xs ${
                  index === selectedBookIndex
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#dedede] bg-white text-[#555555]"
                }`}
              >
                {book.title}
              </button>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {addingBook ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <input
                  value={newBookTitle}
                  onChange={event => setNewBookTitle(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && newBookTitle.trim()) {
                      createBook.mutate({
                        memorialId,
                        title: newBookTitle.trim(),
                      });
                    }
                    if (event.key === "Escape") setAddingBook(false);
                  }}
                  placeholder="책 제목"
                  className="h-10 border border-[#dedede] bg-white px-3 text-sm outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newBookTitle.trim()) {
                      createBook.mutate({
                        memorialId,
                        title: newBookTitle.trim(),
                      });
                    }
                  }}
                  className="h-10 bg-[#171717] px-3 text-white"
                  aria-label="책 추가"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingBook(false)}
                  className="h-10 border border-[#dedede] bg-white px-3 text-[#555555]"
                  aria-label="취소"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingBook(true)}
                className="inline-flex h-10 items-center gap-2 border border-dashed border-[#bcbcbc] bg-white px-4 text-sm text-[#555555]"
              >
                <Plus className="h-4 w-4" />책 추가
              </button>
            )}

            {selectedBook && (
              <>
                <button
                  type="button"
                  onClick={() => setEditingPage({ bookId: selectedBook.id })}
                  className="inline-flex h-10 items-center gap-2 border border-[#dedede] bg-white px-4 text-sm text-[#555555]"
                >
                  <Plus className="h-4 w-4" />
                  페이지 추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(`"${selectedBook.title}" 책을 삭제하시겠습니까?`)
                    ) {
                      deleteBook.mutate({ id: selectedBook.id });
                    }
                  }}
                  className="inline-flex h-10 items-center gap-2 border border-red-200 bg-white px-4 text-sm text-red-500"
                >
                  <Trash2 className="h-4 w-4" />책 삭제
                </button>
              </>
            )}
          </div>
        )}

        {booksQuery.isLoading ? (
          <div className="border border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
            책장을 불러오고 있습니다.
          </div>
        ) : selectedBook ? (
          viewMode === "book" ? (
            <BookView
              bookRef={bookRef}
              pages={flipPages}
              bookOpened={bookOpened}
              setBookOpened={setBookOpened}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isAdmin={isAdmin}
              selectedBook={selectedBook}
              sortedPages={sortedPages}
              onEditPage={page =>
                setEditingPage({ ...page, bookId: selectedBook.id })
              }
              onDeletePage={page => {
                if (confirm("이 페이지를 삭제하시겠습니까?")) {
                  deletePage.mutate({ id: page.id });
                }
              }}
            />
          ) : (
            <TimelineView
              pages={sortedPages}
              isAdmin={isAdmin}
              onEditPage={page =>
                setEditingPage({ ...page, bookId: selectedBook.id })
              }
              onDeletePage={page => {
                if (confirm("이 페이지를 삭제하시겠습니까?")) {
                  deletePage.mutate({ id: page.id });
                }
              }}
            />
          )
        ) : (
          isAdmin && (
            <div className="border border-dashed border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
              첫 번째 책을 추가해 주세요.
            </div>
          )
        )}
      </div>

      {editingPage && (
        <PageEditModal
          page={editingPage}
          onClose={() => setEditingPage(null)}
          onSave={data => {
            if (editingPage.id)
              updatePage.mutate({ id: editingPage.id, ...data });
            else {
              addPage.mutate({
                bookId: editingPage.bookId,
                title: data.title ?? undefined,
                content: data.content ?? undefined,
                photoUrl: data.photoUrl ?? undefined,
                photoKey: data.photoKey ?? undefined,
                dateYear: data.dateYear ?? undefined,
                dateMonth: data.dateMonth ?? undefined,
                dateDay: data.dateDay ?? undefined,
              });
            }
          }}
        />
      )}
    </section>
  );
}

function BookView({
  bookRef,
  pages,
  currentPage,
  setCurrentPage,
  bookOpened,
  setBookOpened,
  isAdmin,
  selectedBook,
  sortedPages,
  onEditPage,
  onDeletePage,
}: {
  bookRef: MutableRefObject<any>;
  pages: ReactElement[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  bookOpened: boolean;
  setBookOpened: (opened: boolean) => void;
  isAdmin: boolean;
  selectedBook: MemorialBook;
  sortedPages: BookPage[];
  onEditPage: (page: BookPage) => void;
  onDeletePage: (page: BookPage) => void;
}) {
  const editablePage = sortedPages[currentPage - 1];
  // 책은 한 벌만 그린다. 두 벌을 CSS 로 숨겨 두면 둘 다 같은 bookRef 를 잡아,
  // 화살표가 보이지 않는 쪽 책을 넘기고 눈앞의 책은 그대로였다.
  const isMobile = useIsMobile();


  // 펼침 보기는 한 번에 두 장씩 넘어간다. 마지막 칸을 (전체-1) 로 잡으면
  // 책은 더 못 넘어가는데 숫자만 올라가 어긋난다(운영에서 4/4 로 확인).
  // 그래서 "마지막으로 펼쳐지는 자리"까지만 센다.
  const pageStep = isMobile ? 1 : 2;
  const lastPageIndex = Math.max(0, pages.length - pageStep);

  // 쪽 번호는 "화면에 실제로 보이는 쪽"에서 읽는다.
  //
  // 책이 알려주는 값(onFlip 의 data, getCurrentPageIndex)은 모두 한 박자 늦어서
  // 눌러도 숫자가 그대로였다 — 운영 화면에서 두 방법 다 확인했다. 반면 눈에 보이는
  // 것은 거짓말을 하지 않는다. 손가락이나 마우스로 끌어 넘겨도 이 방법은 맞는다.
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const syncPageFromScreen = () => {
    const area = bookAreaRef.current;
    if (!area) return;
    const shown = Array.from(
      area.querySelectorAll<HTMLElement>("[data-page-index]")
    )
      .filter(node => node.getBoundingClientRect().width > 50)
      .map(node => Number(node.dataset.pageIndex))
      .filter(index => Number.isInteger(index));
    if (shown.length > 0) setCurrentPage(Math.min(...shown));
  };
  // 넘김이 끝나는 시점이 제각각이라 몇 번에 나눠 확인한다.
  const syncPageSoon = () => {
    [60, 400, 900].forEach(delay =>
      window.setTimeout(syncPageFromScreen, delay)
    );
  };

  // 화살표는 누르는 즉시 숫자를 바꿔 눌린 것이 보이게 하고,
  // 넘김이 끝나면 화면에서 읽은 값으로 맞춘다.
  const goToPrevPage = () => {
    setCurrentPage(Math.max(0, currentPage - pageStep));
    bookRef.current?.pageFlip?.()?.flipPrev();
    syncPageSoon();
  };
  const goToNextPage = () => {
    setCurrentPage(Math.min(lastPageIndex, currentPage + pageStep));
    bookRef.current?.pageFlip?.()?.flipNext();
    syncPageSoon();
  };

  // 읽기 창이 떠 있는 동안: Esc 로 닫고, 좌우 화살표 키로 넘기고,
  // 뒤 페이지는 스크롤되지 않게 잠근다.
  useEffect(() => {
    if (!bookOpened) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBookOpened(false);
      if (event.key === "ArrowLeft") goToPrevPage();
      if (event.key === "ArrowRight") goToNextPage();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // goToPrevPage/goToNextPage 는 currentPage 를 닫아 두므로 함께 갱신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookOpened, currentPage, lastPageIndex]);

  const cover = (
      <div className="memorial-book-cover mx-auto max-w-3xl border border-[#dedede] bg-[#fdfdfd] px-6 py-16 text-center md:px-12 md:py-24">
        <div className="mx-auto mb-8 h-px w-16 bg-[#666666]" />
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-[#666666]">
          The Book Of Faith
        </p>
        <h3
          className="text-balance break-keep text-3xl font-light leading-tight text-[#171717] [overflow-wrap:anywhere] md:text-4xl"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          {selectedBook.title}
        </h3>
        {selectedBook.subtitle && (
          <p className="mx-auto mt-5 max-w-xl break-keep text-sm leading-7 text-[#666666] [overflow-wrap:anywhere]">
            {selectedBook.subtitle}
          </p>
        )}
        <button
          type="button"
          onClick={() => setBookOpened(true)}
          className="memorial-book-open-button mt-10 inline-flex h-12 items-center justify-center gap-2 bg-[#171717] px-7 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" />
          책 펼쳐보기
        </button>
        <p className="mt-4 text-xs text-[#666666]">
          모두 {pages.length}쪽입니다.
        </p>
      </div>
  );

  if (!bookOpened) return cover;

  // 책은 화면 전체를 덮는 읽기 창(팝업) 안에서 넘긴다 (2026-09-16).
  // 전에는 본문 안에 그려져 스크롤 위치에 따라 책이 잘려 보였고,
  // 넘기다 보면 페이지가 같이 움직였다.
  return (
    <>
      {cover}
      <div
        className="memorial-book-reader fixed inset-0 z-[100] flex flex-col bg-[#101010]/95 text-white"
        role="dialog"
        aria-modal="true"
        aria-label={`${selectedBook.title} 책장`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">
              The Book Of Faith
            </p>
            <p
              className="truncate text-base font-light md:text-lg"
              style={{ fontFamily: "'Noto Serif KR', serif" }}
            >
              {selectedBook.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBookOpened(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/30 text-white transition-colors hover:bg-white/10"
            aria-label="책장 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-2">
          <div
            ref={bookAreaRef}
            className="memorial-book-open"
            style={{ width: bookReaderFrameWidth(isMobile) }}
          >
            {!isMobile && (
              <HTMLFlipBook
                key={`desktop-${selectedBook.id}-${sortedPages.map(page => page.id).join("-")}`}
                ref={bookRef}
                width={560}
                height={720}
                size="stretch"
                minWidth={320}
                maxWidth={900}
                minHeight={420}
                maxHeight={1160}
                showCover={false}
                onFlip={syncPageSoon}
                onChangeState={syncPageSoon}
                mobileScrollSupport
                className="mx-auto"
                startPage={0}
                drawShadow
                flippingTime={850}
                usePortrait={false}
                startZIndex={0}
                autoSize
                maxShadowOpacity={0.18}
                showPageCorners
                disableFlipByClick={false}
                useMouseEvents
                swipeDistance={30}
                clickEventForward
                style={{}}
              >
                {pages}
              </HTMLFlipBook>
            )}

            {isMobile && (
              <HTMLFlipBook
                key={`mobile-${selectedBook.id}-${sortedPages.map(page => page.id).join("-")}`}
                ref={bookRef}
                width={340}
                height={500}
                size="stretch"
                minWidth={240}
                maxWidth={520}
                minHeight={360}
                maxHeight={760}
                showCover={false}
                onFlip={syncPageSoon}
                onChangeState={syncPageSoon}
                mobileScrollSupport={false}
                className="mx-auto"
                startPage={0}
                drawShadow
                flippingTime={700}
                usePortrait
                startZIndex={0}
                autoSize
                maxShadowOpacity={0.14}
                showPageCorners
                disableFlipByClick={false}
                useMouseEvents
                swipeDistance={20}
                clickEventForward
                style={{}}
              >
                {pages}
              </HTMLFlipBook>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 md:gap-6 md:py-4">
          <button
            type="button"
            onClick={goToPrevPage}
            className="flex h-11 w-11 items-center justify-center border border-white/30 text-white transition-colors hover:bg-white/10"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[5rem] text-center text-sm text-white/80">
            {pageStep > 1 && currentPage + 1 < pages.length
              ? `${currentPage + 1}–${Math.min(currentPage + pageStep, pages.length)}`
              : Math.min(currentPage + 1, pages.length)}{" "}
            / {pages.length}
          </span>
          <button
            type="button"
            onClick={goToNextPage}
            className="flex h-11 w-11 items-center justify-center border border-white/30 text-white transition-colors hover:bg-white/10"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {isAdmin && editablePage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEditPage(editablePage)}
                className="inline-flex h-9 items-center gap-2 border border-white/30 px-3 text-xs text-white hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                페이지 편집
              </button>
              <button
                type="button"
                onClick={() => onDeletePage(editablePage)}
                className="inline-flex h-9 items-center gap-2 border border-red-300/60 px-3 text-xs text-red-200 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setBookOpened(false)}
            className="inline-flex h-9 items-center gap-2 border border-white/30 px-4 text-xs text-white transition-colors hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
            닫기
          </button>
        </div>
      </div>
    </>
  );
}

function TimelineView({
  pages,
  isAdmin,
  onEditPage,
  onDeletePage,
}: {
  pages: BookPage[];
  isAdmin: boolean;
  onEditPage: (page: BookPage) => void;
  onDeletePage: (page: BookPage) => void;
}) {
  if (pages.length === 0) {
    return (
      <div className="border border-[#dedede] bg-white py-16 text-center text-sm text-[#666666]">
        등록된 페이지가 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {pages.map(page => {
        const date = formatDate(page.dateYear, page.dateMonth, page.dateDay);
        return (
          <article key={page.id} className="border-l border-[#666666] pl-5">
            <div className="border border-[#dedede] bg-white p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {date && (
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#666666]">
                      {date}
                    </p>
                  )}
                  {page.title && (
                    <h3
                      className="text-2xl font-light text-[#171717]"
                      style={{ fontFamily: "'Noto Serif KR', serif" }}
                    >
                      {page.title}
                    </h3>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onEditPage(page)}
                      className="inline-flex h-8 items-center gap-1 border border-[#dedede] px-3 text-xs text-[#555555]"
                    >
                      <Pencil className="h-3 w-3" />
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePage(page)}
                      className="inline-flex h-8 items-center gap-1 border border-red-200 px-3 text-xs text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </button>
                  </div>
                )}
              </div>
              {page.photoUrl && (
                <img
                  src={toImgUrl(page.photoUrl)}
                  alt={page.title || date || "기록 사진"}
                  className="mt-5 max-h-[420px] w-full border border-[#dedede] object-contain"
                  style={{ filter: memorialPhotoFilter }}
                />
              )}
              {page.content && (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#555555]">
                  {page.content}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PageEditModal({
  page,
  onSave,
  onClose,
}: {
  page: Partial<BookPage> & { bookId: number };
  onSave: (data: {
    title?: string | null;
    content?: string | null;
    photoUrl?: string | null;
    photoKey?: string | null;
    dateYear?: number | null;
    dateMonth?: number | null;
    dateDay?: number | null;
  }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(page.title || "");
  const [content, setContent] = useState(page.content || "");
  const [photoUrl, setPhotoUrl] = useState(page.photoUrl || "");
  const [photoKey, setPhotoKey] = useState(page.photoKey || "");
  const [dateYear, setDateYear] = useState(page.dateYear?.toString() || "");
  const [dateMonth, setDateMonth] = useState(page.dateMonth?.toString() || "");
  const [dateDay, setDateDay] = useState(page.dateDay?.toString() || "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadImage = trpc.upload.image.useMutation({
    onSuccess: data => {
      setPhotoUrl(data.url);
      setPhotoKey(data.key);
      toast.success("사진이 업로드되었습니다.");
    },
    onError: error => toast.error(error.message),
  });

  const uploadPagePhoto = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImageFile(file);
      await uploadImage.mutateAsync({
        dataUrl: compressed.dataUrl,
        fileName: compressed.fileName,
        folder: "book-pages",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-[#dedede] bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3
            className="text-xl font-light text-[#171717]"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            페이지 편집
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#555555]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#666666]">날짜</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={dateYear}
                onChange={event => setDateYear(event.target.value)}
                placeholder="연도"
                type="number"
                className="h-10 border border-[#dedede] bg-white px-3 text-sm outline-none"
              />
              <input
                value={dateMonth}
                onChange={event => setDateMonth(event.target.value)}
                placeholder="월"
                type="number"
                min={1}
                max={12}
                className="h-10 border border-[#dedede] bg-white px-3 text-sm outline-none"
              />
              <input
                value={dateDay}
                onChange={event => setDateDay(event.target.value)}
                placeholder="일"
                type="number"
                min={1}
                max={31}
                className="h-10 border border-[#dedede] bg-white px-3 text-sm outline-none"
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-[#666666]">제목</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="h-10 w-full border border-[#dedede] bg-white px-3 text-sm outline-none"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs text-[#666666]">사진</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) uploadPagePhoto(file);
              }}
            />
            {photoUrl ? (
              <div className="overflow-hidden border border-[#dedede] bg-white">
                <img
                  src={toImgUrl(photoUrl)}
                  alt="페이지 사진"
                  className="h-44 w-full object-cover"
                  style={{ filter: memorialPhotoFilter }}
                />
                <div className="flex gap-2 border-t border-[#dedede] p-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 border border-[#dedede] py-2 text-xs text-[#555555]"
                  >
                    사진 교체
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl("");
                      setPhotoKey("");
                    }}
                    className="flex-1 border border-red-200 py-2 text-xs text-red-500"
                  >
                    사진 삭제
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 border border-dashed border-[#dedede] bg-white text-sm text-[#666666] disabled:opacity-50"
              >
                <Upload className="h-5 w-5" />
                {uploading ? "업로드 중" : "사진 추가"}
              </button>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-[#666666]">본문</span>
            <textarea
              value={content}
              onChange={event => setContent(event.target.value)}
              rows={6}
              className="w-full resize-y border border-[#dedede] bg-white px-3 py-2 text-sm leading-7 outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 border border-[#dedede] text-sm text-[#555555]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: title || null,
                content: content || null,
                photoUrl: photoUrl || null,
                photoKey: photoKey || null,
                dateYear: dateYear ? Number(dateYear) : null,
                dateMonth: dateMonth ? Number(dateMonth) : null,
                dateDay: dateDay ? Number(dateDay) : null,
              })
            }
            disabled={uploading}
            className="h-10 flex-1 bg-[#171717] text-sm text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
