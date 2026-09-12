export type FamilyRoomUser = {
  id: number;
  role: string;
  approvalStatus?: string;
} | null;

export type FamilyRoomMemorial = {
  createdByUserId: number | null;
};

/**
 * 가족관을 만들거나 고칠 수 있는 사람인지 판단한다.
 *
 * 통과하는 사람은 두 부류다.
 *   - 그 추모관을 만든 유가족 본인
 *   - 교회 관리자
 *
 * 사진첩과 추모관 본문은 게시된 뒤에는 유가족이 직접 못 고치고 관리자 검토를 거친다
 * (canManageMemorialGallery). 가족관은 일부러 그 규칙을 따르지 않는다. 가족관 내용은
 * 공개 화면에 전혀 나오지 않아 검토할 대상이 아니고, 무엇보다 비밀번호를 바꾸려고
 * 교회에 전화해야 하는 상황을 없애려고 만드는 기능이기 때문이다.
 */
export function canManageMemorialFamilyRoom(
  memorial: FamilyRoomMemorial | null,
  user: FamilyRoomUser
) {
  if (!memorial || !user || user.approvalStatus === "rejected") return false;
  if (user.role === "admin") return true;
  // 만든 사람이 탈퇴하면 이 칸은 비게 된다. 그때 아무나 주인이 되어서는 안 된다.
  if (memorial.createdByUserId === null) return false;
  return memorial.createdByUserId === user.id;
}
