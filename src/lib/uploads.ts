/**
 * What the admin may upload. Shared by the upload button (browser) and the upload route (server),
 * which checks it again: the browser's check is only a convenience.
 */
export type UploadKind = "image" | "file";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/msword", "application/vnd.ms-excel", "text/csv",
  ...IMAGE_TYPES,
];
export const allowedTypes = (kind: UploadKind) => (kind === "image" ? IMAGE_TYPES : FILE_TYPES);

/** Cloud uploads go straight from the browser to storage; the local fallback passes through the server. */
export const MAX_CLOUD_BYTES = 50 * 1024 * 1024;
export const MAX_LOCAL_BYTES = 20 * 1024 * 1024;
