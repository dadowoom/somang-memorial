export type GalleryUser = {
  id: number;
  role: string;
  approvalStatus?: string;
} | null;
export type GalleryMemorial = {
  createdByUserId: number | null;
  status: string;
};

export function canManageMemorialGallery(
  memorial: GalleryMemorial | null,
  user: GalleryUser
) {
  if (!memorial || !user || user.approvalStatus === "rejected") return false;
  if (user.role === "admin") return true;
  // A published (including privately visible) memorial keeps the admin review boundary.
  return memorial.status === "pending" && memorial.createdByUserId === user.id;
}
