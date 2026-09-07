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
      canEdit: false,
      canAddPhotos: false,
      canShare: visibility === "public",
      message:
        visibility === "private"
          ? "비공개로 게시되었습니다. 사진·글 변경은 관리자에게 요청해 주세요. 주소만으로 본문이 열리지는 않습니다."
          : "게시되었습니다. 가족에게 주소를 공유할 수 있습니다. 사진·글 변경은 관리자에게 요청해 주세요.",
    };
  if (status === "private")
    return {
      canEdit: true,
      canAddPhotos: false,
      canShare: false,
      message:
        "비공개 상태입니다. 글은 수정할 수 있으며 사진 변경은 관리자에게 요청해 주세요.",
    };
  return {
    canEdit: false,
    canAddPhotos: false,
    canShare: false,
    message: "상태를 확인해야 합니다. 관리자에게 문의해 주세요.",
  };
}
