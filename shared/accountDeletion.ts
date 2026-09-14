/**
 * 회원이 탈퇴할 때 그 사람이 만든 추모관을 어떻게 할지 정한다 (2026-09-14).
 *
 * 추모관은 고인을 기억하는 공동의 기록이라 지우지 않는다. 그런데 주인이 없어지면
 * 관리자 말고는 아무도 고칠 수 없는 "주인 없는 추모관"이 생긴다. 그래서:
 *   - 함께 관리하는 가족이 있으면 → 가장 먼저 들어온 가족에게 주인을 넘긴다.
 *   - 가족이 없으면 → 탈퇴를 막고, 먼저 가족을 초대하거나 교회에 연락하라고 안내한다.
 *
 * 순수 함수라 DB 없이 시험한다. 실제 조회·변경은 server/db.ts 가 한다.
 */
export type OwnedMemorialForDeletion = {
  id: number;
  name: string;
  slug: string;
  /** 함께 관리하는 가족. 들어온 순서대로. */
  members: Array<{ userId: number; name: string | null }>;
};

export type MemorialHandover = {
  memorialId: number;
  name: string;
  slug: string;
  toUserId: number;
  toName: string | null;
};

export type MemorialHandoverPlan = {
  /** 가족이 없어 넘길 수 없는 추모관. 하나라도 있으면 탈퇴하지 않는다. */
  blocked: Array<{ id: number; name: string; slug: string }>;
  /** 가족에게 넘길 추모관. blocked 가 비어 있을 때만 실행한다. */
  transfers: MemorialHandover[];
};

export function planMemorialHandover(
  owned: OwnedMemorialForDeletion[]
): MemorialHandoverPlan {
  const blocked: MemorialHandoverPlan["blocked"] = [];
  const transfers: MemorialHandover[] = [];

  for (const memorial of owned) {
    const successor = memorial.members[0];
    if (!successor) {
      blocked.push({
        id: memorial.id,
        name: memorial.name,
        slug: memorial.slug,
      });
      continue;
    }
    transfers.push({
      memorialId: memorial.id,
      name: memorial.name,
      slug: memorial.slug,
      toUserId: successor.userId,
      toName: successor.name,
    });
  }

  return { blocked, transfers };
}

/** 탈퇴를 막을 때 화면에 보여 줄 문장. */
export function describeBlockedMemorials(
  blocked: MemorialHandoverPlan["blocked"]
) {
  const names = blocked.map(item => item.name).join(", ");
  return (
    `만드신 추모관(${names})을 이어서 관리할 가족이 아직 없어 탈퇴할 수 없습니다. ` +
    "먼저 '가족 초대'로 가족을 한 분 이상 초대해 주시거나, 교회로 연락해 주세요."
  );
}
