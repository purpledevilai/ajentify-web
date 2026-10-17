import { api } from "./client";
import type {
  ApiFilesystem,
  ApiFilesystemFileResult,
  ApiFilesystemFolderResult,
  ApiFilesystemNode,
  CreateFileParams,
  CreateFilesystemParams,
  CreateFolderParams,
  DeleteFilesystemResponse,
  DeleteNodeResponse,
  FilesystemSearchResponse,
  FilesystemSearchScope,
  GetFilesystemTreeResponse,
  GetFilesystemsResponse,
  MovePathParams,
  MovePathResponse,
  UpdateFileParams,
  UpdateFilesystemParams,
  UpdateFolderParams,
} from "@/types/api";

/**
 * REST client for filesystem memories. All node paths here are *internal*
 * (`/projects/notes.md`, root `/`) — never prefixed with the filesystem id.
 */
export const filesystemsApi = {
  list: (org_id?: string) =>
    api.get<GetFilesystemsResponse>("/filesystems", { query: { org_id } }),
  get: (filesystem_id: string) =>
    api.get<ApiFilesystem>(`/filesystem/${filesystem_id}`),
  create: (body: CreateFilesystemParams) =>
    api.post<ApiFilesystem>("/filesystem", body),
  update: (filesystem_id: string, body: UpdateFilesystemParams) =>
    api.put<ApiFilesystem>(`/filesystem/${filesystem_id}`, body),
  delete: (filesystem_id: string) =>
    api.delete<DeleteFilesystemResponse>(`/filesystem/${filesystem_id}`),

  tree: (filesystem_id: string) =>
    api.get<GetFilesystemTreeResponse>(`/filesystem/${filesystem_id}/tree`),
  node: (filesystem_id: string, path: string) =>
    api.get<ApiFilesystemNode>(`/filesystem/${filesystem_id}/node`, {
      query: { path },
    }),

  createFolder: (filesystem_id: string, body: CreateFolderParams) =>
    api.post<ApiFilesystemFolderResult>(
      `/filesystem/${filesystem_id}/folder`,
      body
    ),
  updateFolder: (filesystem_id: string, body: UpdateFolderParams) =>
    api.put<ApiFilesystemFolderResult>(
      `/filesystem/${filesystem_id}/folder`,
      body
    ),

  createFile: (filesystem_id: string, body: CreateFileParams) =>
    api.post<ApiFilesystemFileResult>(
      `/filesystem/${filesystem_id}/file`,
      body
    ),
  updateFile: (filesystem_id: string, body: UpdateFileParams) =>
    api.put<ApiFilesystemFileResult>(`/filesystem/${filesystem_id}/file`, body),

  move: (filesystem_id: string, body: MovePathParams) =>
    api.post<MovePathResponse>(`/filesystem/${filesystem_id}/move`, body),
  deleteNode: (filesystem_id: string, path: string, recursive = false) =>
    api.delete<DeleteNodeResponse>(`/filesystem/${filesystem_id}/node`, {
      query: { path, recursive },
    }),

  search: (
    filesystem_id: string,
    q: string,
    opts: { path?: string; scope?: FilesystemSearchScope; limit?: number } = {}
  ) =>
    api.get<FilesystemSearchResponse>(`/filesystem/${filesystem_id}/search`, {
      query: { q, path: opts.path, scope: opts.scope, limit: opts.limit },
    }),
};
