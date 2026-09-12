import { canManageMemorialAsFamily } from "./memorialFamilyPermissions";

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
 * 통과하는 사람은 세 부류다.
 *   - 그 추모관을 만든 유가족 본인
 *   - 가족 초대로 함께 관리하게 된 가족 (isFamilyMember, 2026-09-13)
 *   - 교회 관리자
 *
 * 사진첩과 추모관 본문처럼 게시 상태를 따지지 않는다. 가족관 내용은 공개 화면에
 * 전혀 나오지 않아 검토할 대상이 아니고, 무엇보다 비밀번호를 바꾸려고 교회에
 * 전화해야 하는 상황을 없애려고 만든 기능이기 때문이다.
 */
export function canManageMemorialFamilyRoom(
  memorial: FamilyRoomMemorial | null,
  user: FamilyRoomUser,
  isFamilyMember = false
) {
  return canManageMemorialAsFamily(memorial, user, isFamilyMember);
}
