export type GalleryUser = {
  id: number;
  role: string;
  approvalStatus?: string;
} | null;
export type GalleryMemorial = {
  createdByUserId: number | null;
  status: string;
};

// 유가족이 사진을 고칠 수 있는 추모관 상태. 확인 대기 · 게시 · 관리자 비공개 모두
// 포함한다. 모르는 상태는 막는다.
const MEMBER_EDITABLE_STATUSES = new Set(["pending", "published", "private"]);

/**
 * 사진첩을 고칠 수 있는 사람인지 판단한다.
 *
 * 2026-09-12 결정: 게시된 뒤에도 추모관을 만든 유가족이 직접 고친다. 그 전에는
 * 게시 후 변경을 관리자 사전 확인 뒤에만 허용했는데, 추모관이 늘면 수정 요청을
 * 교회가 하나하나 받아 처리하는 것이 감당이 안 된다. 대신 서버가 감사기록을 남겨
 * 관리자가 사후에 확인한다.
 */
export function canManageMemorialGallery(
  memorial: GalleryMemorial | null,
  user: GalleryUser
) {
  if (!memorial || !user || user.approvalStatus === "rejected") return false;
  if (user.role === "admin") return true;
  // 만든 사람이 탈퇴하면 이 칸은 비게 된다. 그때 아무나 주인이 되어서는 안 된다.
  if (memorial.createdByUserId === null) return false;
  return (
    MEMBER_EDITABLE_STATUSES.has(memorial.status) &&
    memorial.createdByUserId === user.id
  );
}
