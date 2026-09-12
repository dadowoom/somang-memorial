// 2026-09-12 결정: 게시된 뒤에도 추모관을 만든 유가족이 글과 사진을 직접 고친다.
// 관리자 사전 확인 대신 서버가 감사기록을 남겨 사후에 확인한다.
export function memorialNextAction(
  status: string,
  visibility: string,
  isAdmin: boolean
) {
  if (isAdmin)
    return {
      canEdit: true,
      canAddPhotos: true,
      canShare: status === "published" && visibility === "public",
      message: "공개 범위와 내용을 확인해 주세요.",
    };
  if (status === "pending")
    return {
      canEdit: true,
      canAddPhotos: true,
      canShare: false,
      message:
        "관리자 확인 중입니다. 확인 전까지 글과 사진을 준비할 수 있습니다. 아직 공개 검색에는 나오지 않습니다.",
    };
  if (status === "published")
    return {
      canEdit: true,
      canAddPhotos: true,
      canShare: visibility === "public",
      message:
        visibility === "private"
          ? "비공개로 게시되었습니다. 글과 사진은 직접 고칠 수 있고 바로 반영됩니다. 주소만으로 본문이 열리지는 않습니다."
          : "게시되었습니다. 가족에게 주소를 공유할 수 있습니다. 글과 사진은 직접 고칠 수 있고 바로 반영됩니다.",
    };
  if (status === "private")
    return {
      canEdit: true,
      canAddPhotos: true,
      canShare: false,
      message:
        "관리자가 비공개로 돌려 둔 상태입니다. 글과 사진은 고칠 수 있으며, 다시 공개하려면 관리자에게 문의해 주세요.",
    };
  return {
    canEdit: false,
    canAddPhotos: false,
    canShare: false,
    message: "상태를 확인해야 합니다. 관리자에게 문의해 주세요.",
  };
}
