import apiClient from './apiClient';
import { NEWS_ENDPOINTS } from './apiEndpoints';

export type NewsStatus = 'draft' | 'published' | 'archived';

export interface NewsArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  status: NewsStatus;
  publishedAt: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsPayload {
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  status?: NewsStatus;
}

export type UpdateNewsPayload = Partial<CreateNewsPayload>;

export interface NewsListParams {
  status?: NewsStatus;
  page?: number;
  limit?: number;
}

export interface NewsPage {
  items: NewsArticle[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchNewsList(params: NewsListParams = {}): Promise<NewsPage> {
  const response = await apiClient.get<NewsPage>(NEWS_ENDPOINTS.LIST, { params });
  return response.data;
}

export async function fetchNewsDetail(id: number): Promise<NewsArticle> {
  const response = await apiClient.get<NewsArticle>(NEWS_ENDPOINTS.DETAIL(id));
  return response.data;
}

export async function createNewsArticle(payload: CreateNewsPayload): Promise<NewsArticle> {
  const response = await apiClient.post<NewsArticle>(NEWS_ENDPOINTS.CREATE, payload);
  return response.data;
}

export async function updateNewsArticle(
  id: number,
  payload: UpdateNewsPayload,
): Promise<NewsArticle> {
  const response = await apiClient.patch<NewsArticle>(NEWS_ENDPOINTS.UPDATE(id), payload);
  return response.data;
}

export async function deleteNewsArticle(id: number): Promise<void> {
  await apiClient.delete(NEWS_ENDPOINTS.DELETE(id));
}

export interface UploadedImage {
  id: string;
  url: string;
}

interface PresignedUpload {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

/**
 * Presign is the only upload route the backend has. There used to be a probe to
 * `GET /news/images/config` that chose between S3 and a disk upload, but neither
 * that route nor the disk route `POST /news/images` was ever built: the probe
 * 404'd, its catch fell back to "disk", and the disk call 404'd too. Every image
 * upload in this screen failed, and the one route that does work was never
 * reached — the fallback pointed at the dead branch and away from the live one.
 *
 * Failing loudly is the point now: with no S3 configured the backend answers
 * "S3 chưa được cấu hình", which tells an operator what to fix. A swallowed 404
 * told nobody anything.
 */
export async function uploadNewsImage(file: File): Promise<UploadedImage> {
  const presign = await apiClient.post<PresignedUpload>(NEWS_ENDPOINTS.PRESIGN_IMAGE, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });
  const { uploadUrl, publicUrl, headers, key } = presign.data;

  // PUT thẳng lên S3 — KHÔNG dùng apiClient (nó thêm baseURL và interceptor
  // đăng nhập; presigned URL đã có chữ ký riêng, cookie session chỉ làm hỏng).
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`S3 PUT failed: ${putRes.status}`);
  }
  return { id: key, url: publicUrl };
}
