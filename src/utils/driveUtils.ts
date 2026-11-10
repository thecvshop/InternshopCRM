/**
 * Utilities for parsing and previewing Google Drive links for Event Photos and Albums.
 */

export interface ParsedDriveLink {
  isDriveLink: boolean;
  type: 'folder' | 'file' | 'other';
  id: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  directUrl: string;
  label: string;
}

export function parseGoogleDriveUrl(rawUrl: string): ParsedDriveLink {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isDriveLink: false,
      type: 'other',
      id: null,
      embedUrl: null,
      thumbnailUrl: null,
      directUrl: '',
      label: 'Invalid Link',
    };
  }

  const cleanUrl = rawUrl.trim();

  // 1. Google Drive Folder
  // e.g. https://drive.google.com/drive/folders/1ABC_xyz... or https://drive.google.com/drive/u/0/folders/1ABC_xyz...
  const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    return {
      isDriveLink: true,
      type: 'folder',
      id: folderId,
      // Google Drive embedded folder view with grid/list mode
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`,
      thumbnailUrl: null,
      directUrl: `https://drive.google.com/drive/folders/${folderId}`,
      label: `Google Drive Folder (${folderId.slice(0, 8)}...)`,
    };
  }

  // 2. Google Drive Single File (photo, video, zip)
  // e.g. https://drive.google.com/file/d/1ABC_xyz.../view?usp=sharing or ?id=1ABC_xyz...
  const fileMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      isDriveLink: true,
      type: 'file',
      id: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      directUrl: `https://drive.google.com/file/d/${fileId}/view`,
      label: `Google Drive File (${fileId.slice(0, 8)}...)`,
    };
  }

  // 3. Google Photos album
  if (cleanUrl.includes('photos.app.goo.gl') || cleanUrl.includes('photos.google.com')) {
    return {
      isDriveLink: true,
      type: 'folder',
      id: null,
      embedUrl: cleanUrl,
      thumbnailUrl: null,
      directUrl: cleanUrl,
      label: 'Google Photos Album',
    };
  }

  // Not a drive link (standard web image or url)
  return {
    isDriveLink: false,
    type: 'other',
    id: null,
    embedUrl: null,
    thumbnailUrl: cleanUrl,
    directUrl: cleanUrl,
    label: 'Direct Photo Link',
  };
}
