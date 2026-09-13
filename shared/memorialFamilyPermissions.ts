/**
 * 추모관을 "가족으로서" 관리할 수 있는 사람인지 판단한다 (2026-09-13 가족 초대).
 *
 * 세 부류가 있다.
 *   - 주인: 추모관을 만든 유가족 (memorials.createdByUserId)
 *   - 함께 관리하는 가족: 주인이 보낸 초대 링크로 들어온 사람 (memorial_family_members)
 *   - 교회 관리자
 *
 * 글·사진·가족관은 세 부류 모두 고칠 수 있다. **초대와 가족 제외는 주인과 관리자만**
 * 한다. 초대받은 가족이 또 초대하기 시작하면 주인이 누가 들어왔는지 알 수 없게 된다.
 *
 * 이 파일은 DB 를 모른다. "함께 관리하는 가족인지"는 부르는 쪽이 조회해서 넘긴다.
 */
export type FamilyAccessUser = {
  id: number;
  role: string;
  approvalStatus?: string;
} | null;

export type FamilyAccessMemorial = {
  createdByUserId: number | null;
};

export type MemorialFamilyRole = "admin" | "owner" | "member" | null;

export function memorialFamilyRole(
  memorial: FamilyAccessMemorial | null,
  user: FamilyAccessUser,
  isFamilyMember = false
): MemorialFamilyRole {
  if (!memorial || !user || user.approvalStatus === "rejected") return null;
  if (user.role === "admin") return "admin";
  // 만든 사람이 탈퇴하면 이 칸은 비게 된다. 그때 아무나 주인이 되어서는 안 된다.
  if (memorial.createdByUserId !== null && memorial.createdByUserId === user.id)
    return "owner";
  if (isFamilyMember) return "member";
  return null;
}

/** 글·사진·가족관을 고칠 수 있는가. */
export function canManageMemorialAsFamily(
  memorial: FamilyAccessMemorial | null,
  user: FamilyAccessUser,
  isFamilyMember = false
) {
  return memorialFamilyRole(memorial, user, isFamilyMember) !== null;
}

/** 가족을 초대하거나 제외할 수 있는가. 주인과 관리자만. */
export function canInviteMemorialFamily(
  memorial: FamilyAccessMemorial | null,
  user: FamilyAccessUser
) {
  const role = memorialFamilyRole(memorial, user, false);
  return role === "owner" || role === "admin";
}
