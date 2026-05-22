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
import { forwardRef, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
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
};

type ViewMode = "book" | "timeline";

const memorialPhotoFilter = "grayscale(1) contrast(1.04) brightness(1.02)";

function formatDate(year?: number | null, month?: number | null, day?: number | null) {
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

const CoverPage = forwardRef<HTMLDivElement, { book: MemorialBook }>(
  function CoverPage({ book }, ref) {
    return (
      <div
        ref={ref}
        className="flex h-full flex-col items-center justify-center bg-[#fffefa] p-8 text-center"
      >
        <div className="mb-8 h-px w-16 bg-[#7f673d]" />
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-[#7f673d]">
          The Book Of Faith
        </p>
        <h3
          className="text-3xl font-light leading-tight text-[#2e2218]"
          style={{ fontFamily: "'Noto Serif KR', serif" }}
        >
          {book.title}
        </h3>
        {book.subtitle && (
          <p className="mt-5 text-sm leading-7 text-[#6f6a61]">{book.subtitle}</p>
        )}
        <p className="mt-10 inline-flex items-center gap-2 text-xs text-[#7f673d]">
          <BookOpen className="h-3.5 w-3.5" />
          넘겨서 읽어주세요
        </p>
      </div>
    );
  }
);

const ContentPage = forwardRef<HTMLDivElement, { page: BookPage }>(
  function ContentPage({ page }, ref) {
    const date = formatDate(page.dateYear, page.dateMonth, page.dateDay);
    return (
      <div
        ref={ref}
        className="relative flex h-full flex-col overflow-hidden bg-[#fffefa] p-6 md:p-8"
      >
        {date && (
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#7f673d]">
            {date}
          </p>
        )}
        {page.photoUrl && (
          <div className="mb-4 h-[38%] shrink-0 overflow-hidden border border-[#e6ded1]">
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
            className="mb-3 text-xl font-light leading-snug text-[#2e2218]"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            {page.title}
          </h4>
        )}
        {page.content && (
          <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-8 text-[#4f4638]">
            {page.content}
          </p>
        )}
      </div>
    );
  }
);

const EndPage = forwardRef<HTMLDivElement>(function EndPage(_, ref) {
  return (
    <div
      ref={ref}
      className="flex h-full flex-col items-center justify-center bg-[#fffefa] p-8 text-center"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-[#7f673d]">
        Soli Deo Gloria
      </p>
      <p
        className="mt-5 text-2xl font-light text-[#2e2218]"
        style={{ fontFamily: "'Noto Serif KR', serif" }}
      >
        오직 하나님께 영광
      </p>
    </div>
  );
});

const BlankPage = forwardRef<HTMLDivElement>(function BlankPage(_, ref) {
  return <div ref={ref} className="h-full bg-[#fffefa]" />;
});

export default function MemorialBookSection({
  memorialId,
  isAdmin,
}: MemorialBookSectionProps) {
  const utils = trpc.useUtils();
  const bookRef = useRef<any>(null);
  const booksQuery = trpc.book.listByMemorial.useQuery({ memorialId });
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("book");
  const [addingBook, setAddingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [editingPage, setEditingPage] = useState<
    (Partial<BookPage> & { bookId: number }) | null
  >(null);

  const allBooks = (booksQuery.data ?? []) as MemorialBook[];
  const books = isAdmin ? allBooks : allBooks.filter(book => book.pages.length > 0);
  const selectedBook = books[Math.min(selectedBookIndex, Math.max(books.length - 1, 0))];
  const sortedPages = useMemo(
    () => (selectedBook ? sortPages(selectedBook.pages) : []),
    [selectedBook]
  );

  const createBook = trpc.book.create.useMutation({
    onSuccess: () => {
      toast.success("책이 추가되었습니다.");
      setAddingBook(false);
      setNewBookTitle("");
      utils.book.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const deleteBook = trpc.book.delete.useMutation({
    onSuccess: () => {
      toast.success("책이 삭제되었습니다.");
      setSelectedBookIndex(0);
      utils.book.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const addPage = trpc.book.addPage.useMutation({
    onSuccess: () => {
      toast.success("페이지가 추가되었습니다.");
      setEditingPage(null);
      utils.book.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const updatePage = trpc.book.updatePage.useMutation({
    onSuccess: () => {
      toast.success("저장되었습니다.");
      setEditingPage(null);
      utils.book.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });
  const deletePage = trpc.book.deletePage.useMutation({
    onSuccess: () => {
      toast.success("페이지가 삭제되었습니다.");
      utils.book.listByMemorial.invalidate({ memorialId });
    },
    onError: error => toast.error(error.message),
  });

  const flipPages = useMemo(() => {
    if (!selectedBook) return [];
    const pages = [
      <CoverPage key="cover" book={selectedBook} />,
      ...sortedPages.map(page => <ContentPage key={page.id} page={page} />),
      <EndPage key="end" />,
    ];
    if (pages.length % 2 !== 0) pages.push(<BlankPage key="blank" />);
    return pages;
  }, [selectedBook, sortedPages]);

  if (!booksQuery.isLoading && books.length === 0 && !isAdmin) return null;

  return (
    <section className="border-t border-[#e6ded1] bg-white py-20 md:py-28">
      <div className="container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-[#7f673d]">
            The Book Of Faith
          </p>
          <h2
            className="text-3xl font-light md:text-4xl"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            책장과 연표
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#6f6a61]">
            페이지마다 날짜와 사진, 이야기를 담아 더 깊은 기록을 남깁니다.
          </p>
        </div>

        {books.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex border border-[#e6ded1] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("book")}
                className={`inline-flex h-9 items-center gap-2 px-4 text-xs ${
                  viewMode === "book"
                    ? "bg-[#1f1d1a] text-white"
                    : "text-[#4f4638]"
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
                    ? "bg-[#1f1d1a] text-white"
                    : "text-[#4f4638]"
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
                    ? "border-[#1f1d1a] bg-[#1f1d1a] text-white"
                    : "border-[#e6ded1] bg-white text-[#4f4638]"
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
                      createBook.mutate({ memorialId, title: newBookTitle.trim() });
                    }
                    if (event.key === "Escape") setAddingBook(false);
                  }}
                  placeholder="책 제목"
                  className="h-10 border border-[#e6ded1] bg-white px-3 text-sm outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newBookTitle.trim()) {
                      createBook.mutate({ memorialId, title: newBookTitle.trim() });
                    }
                  }}
                  className="h-10 bg-[#1f1d1a] px-3 text-white"
                  aria-label="책 추가"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingBook(false)}
                  className="h-10 border border-[#e6ded1] bg-white px-3 text-[#4f4638]"
                  aria-label="취소"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingBook(true)}
                className="inline-flex h-10 items-center gap-2 border border-dashed border-[#c8b383] bg-white px-4 text-sm text-[#4f4638]"
              >
                <Plus className="h-4 w-4" />
                책 추가
              </button>
            )}

            {selectedBook && (
              <>
                <button
                  type="button"
                  onClick={() => setEditingPage({ bookId: selectedBook.id })}
                  className="inline-flex h-10 items-center gap-2 border border-[#e6ded1] bg-white px-4 text-sm text-[#4f4638]"
                >
                  <Plus className="h-4 w-4" />
                  페이지 추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`"${selectedBook.title}" 책을 삭제하시겠습니까?`)) {
                      deleteBook.mutate({ id: selectedBook.id });
                    }
                  }}
                  className="inline-flex h-10 items-center gap-2 border border-red-200 bg-white px-4 text-sm text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  책 삭제
                </button>
              </>
            )}
          </div>
        )}

        {booksQuery.isLoading ? (
          <div className="border border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
            책장을 불러오고 있습니다.
          </div>
        ) : selectedBook ? (
          viewMode === "book" ? (
            <BookView
              bookRef={bookRef}
              pages={flipPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isAdmin={isAdmin}
              selectedBook={selectedBook}
              sortedPages={sortedPages}
              onEditPage={page => setEditingPage({ ...page, bookId: selectedBook.id })}
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
              onEditPage={page => setEditingPage({ ...page, bookId: selectedBook.id })}
              onDeletePage={page => {
                if (confirm("이 페이지를 삭제하시겠습니까?")) {
                  deletePage.mutate({ id: page.id });
                }
              }}
            />
          )
        ) : (
          isAdmin && (
            <div className="border border-dashed border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
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
            if (editingPage.id) updatePage.mutate({ id: editingPage.id, ...data });
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
  isAdmin: boolean;
  selectedBook: MemorialBook;
  sortedPages: BookPage[];
  onEditPage: (page: BookPage) => void;
  onDeletePage: (page: BookPage) => void;
}) {
  const editablePage = sortedPages[currentPage - 1];

  return (
    <div>
      <div className="hidden md:block">
        <HTMLFlipBook
          key={`desktop-${selectedBook.id}-${sortedPages.map(page => page.id).join("-")}`}
          ref={bookRef}
          width={560}
          height={720}
          size="stretch"
          minWidth={420}
          maxWidth={720}
          minHeight={520}
          maxHeight={860}
          showCover
          mobileScrollSupport
          onFlip={(event: { data: number }) => setCurrentPage(event.data)}
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
      </div>

      <div className="block md:hidden">
        <HTMLFlipBook
          key={`mobile-${selectedBook.id}-${sortedPages.map(page => page.id).join("-")}`}
          ref={bookRef}
          width={340}
          height={500}
          size="stretch"
          minWidth={280}
          maxWidth={390}
          minHeight={420}
          maxHeight={560}
          showCover
          mobileScrollSupport={false}
          onFlip={(event: { data: number }) => setCurrentPage(event.data)}
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
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
          className="flex h-10 w-10 items-center justify-center border border-[#e6ded1] bg-white text-[#4f4638]"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-[#6f6a61]">
          {Math.min(currentPage + 1, pages.length)} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip()?.flipNext()}
          className="flex h-10 w-10 items-center justify-center border border-[#e6ded1] bg-white text-[#4f4638]"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isAdmin && editablePage && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => onEditPage(editablePage)}
            className="inline-flex h-9 items-center gap-2 border border-[#e6ded1] bg-white px-3 text-xs text-[#4f4638]"
          >
            <Pencil className="h-3.5 w-3.5" />
            페이지 편집
          </button>
          <button
            type="button"
            onClick={() => onDeletePage(editablePage)}
            className="inline-flex h-9 items-center gap-2 border border-red-200 bg-white px-3 text-xs text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
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
      <div className="border border-[#e6ded1] bg-white py-16 text-center text-sm text-[#6f6a61]">
        등록된 페이지가 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {pages.map(page => {
        const date = formatDate(page.dateYear, page.dateMonth, page.dateDay);
        return (
          <article key={page.id} className="border-l border-[#7f673d] pl-5">
            <div className="border border-[#e6ded1] bg-white p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {date && (
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#7f673d]">
                      {date}
                    </p>
                  )}
                  {page.title && (
                    <h3
                      className="text-2xl font-light text-[#2e2218]"
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
                      className="inline-flex h-8 items-center gap-1 border border-[#e6ded1] px-3 text-xs text-[#4f4638]"
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
                  className="mt-5 max-h-[420px] w-full border border-[#e6ded1] object-contain"
                  style={{ filter: memorialPhotoFilter }}
                />
              )}
              {page.content && (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#6f5b35]">
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
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-[#e6ded1] bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3
            className="text-xl font-light text-[#2e2218]"
            style={{ fontFamily: "'Noto Serif KR', serif" }}
          >
            페이지 편집
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#4f4638]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[#6f6a61]">날짜</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={dateYear}
                onChange={event => setDateYear(event.target.value)}
                placeholder="연도"
                type="number"
                className="h-10 border border-[#e6ded1] bg-white px-3 text-sm outline-none"
              />
              <input
                value={dateMonth}
                onChange={event => setDateMonth(event.target.value)}
                placeholder="월"
                type="number"
                min={1}
                max={12}
                className="h-10 border border-[#e6ded1] bg-white px-3 text-sm outline-none"
              />
              <input
                value={dateDay}
                onChange={event => setDateDay(event.target.value)}
                placeholder="일"
                type="number"
                min={1}
                max={31}
                className="h-10 border border-[#e6ded1] bg-white px-3 text-sm outline-none"
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-[#6f6a61]">제목</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="h-10 w-full border border-[#e6ded1] bg-white px-3 text-sm outline-none"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs text-[#6f6a61]">사진</span>
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
              <div className="overflow-hidden border border-[#e6ded1] bg-white">
                <img
                  src={toImgUrl(photoUrl)}
                  alt="페이지 사진"
                  className="h-44 w-full object-cover"
                  style={{ filter: memorialPhotoFilter }}
                />
                <div className="flex gap-2 border-t border-[#e6ded1] p-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 border border-[#e6ded1] py-2 text-xs text-[#4f4638]"
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
                className="flex h-28 w-full flex-col items-center justify-center gap-2 border border-dashed border-[#e6ded1] bg-white text-sm text-[#6f6a61] disabled:opacity-50"
              >
                <Upload className="h-5 w-5" />
                {uploading ? "업로드 중" : "사진 추가"}
              </button>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-[#6f6a61]">본문</span>
            <textarea
              value={content}
              onChange={event => setContent(event.target.value)}
              rows={6}
              className="w-full resize-y border border-[#e6ded1] bg-white px-3 py-2 text-sm leading-7 outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 border border-[#e6ded1] text-sm text-[#4f4638]"
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
            className="h-10 flex-1 bg-[#1f1d1a] text-sm text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
