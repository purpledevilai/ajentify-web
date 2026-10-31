import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ImportPlan, ImportResult } from "@/lib/filesystems/archive";

// --- archive logic (sibling-owned; mocked so this test is self-contained) ---
const PLAN: ImportPlan = {
  rootName: "My Notes",
  rootDescription: "desc",
  folders: [{ path: "/projects", description: "p", depth: 1 }],
  files: [
    { path: "/a.md", content: "a", size: 1 },
    { path: "/b.md", content: "b", size: 1 },
  ],
  skipped: [{ relativePath: "My Notes/img.png", reason: "binary" }],
  totalBytes: 2,
};
const RESULT: ImportResult = {
  folders: { created: 1, exists: 0, failed: 0 },
  files: { created: 1, exists: 1, failed: 0 },
  items: [{ path: "/b.md", type: "file", status: "exists" }],
  cancelled: false,
};

const pickedFilesFromFileList = vi.fn();
const planImport = vi.fn();
const runImport = vi.fn();
vi.mock("@/lib/filesystems/archive", () => ({
  pickedFilesFromFileList: (...a: unknown[]) => pickedFilesFromFileList(...a),
  planImport: (...a: unknown[]) => planImport(...a),
  runImport: (...a: unknown[]) => runImport(...a),
}));

// --- store + api ------------------------------------------------------------
const create = vi.fn();
const del = vi.fn();
vi.mock("@/lib/stores/filesystems-store", () => ({
  filesystemsActions: {
    create: (...a: unknown[]) => create(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

const createFolder = vi.fn();
const createFile = vi.fn();
vi.mock("@/lib/api/filesystems", () => ({
  filesystemsApi: {
    createFolder: (...a: unknown[]) => createFolder(...a),
    createFile: (...a: unknown[]) => createFile(...a),
  },
}));

import { FilesystemImportDialog } from "../filesystem-import-dialog";

beforeEach(() => {
  pickedFilesFromFileList.mockReset();
  planImport.mockReset();
  runImport.mockReset();
  create.mockReset();
  del.mockReset();
  createFolder.mockReset();
  createFile.mockReset();

  pickedFilesFromFileList.mockImplementation((files: FileList | File[]) =>
    Array.from(files).map((f) => ({
      relativePath: f.name,
      size: f.size,
      arrayBuffer: () => f.arrayBuffer(),
    }))
  );
  planImport.mockResolvedValue(PLAN);
  runImport.mockImplementation(
    async (
      _plan: ImportPlan,
      _client: unknown,
      opts: { onProgress?: (p: { done: number; total: number; current: string | null }) => void }
    ) => {
      opts.onProgress?.({ done: 1, total: 3, current: "/projects" });
      return RESULT;
    }
  );
  create.mockImplementation(async (p: { name: string; description: string }) => ({
    filesystem_id: "fs1",
    name: p.name,
    description: p.description,
    org_id: "o",
    created_at: 1,
    updated_at: 1,
  }));
});

function pickFolder() {
  const input = screen.getByTestId("import-folder-input") as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["x"], "a.md")] },
  });
}

describe("FilesystemImportDialog", () => {
  it("new mode: pick → review (prefilled) → import creates the filesystem → report → Open filesystem", async () => {
    const onFinished = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FilesystemImportDialog
        open
        onOpenChange={onOpenChange}
        mode={{ kind: "new" }}
        onFinished={onFinished}
      />
    );

    pickFolder();

    expect(await screen.findByText(/1 folder/)).toBeInTheDocument();
    expect(screen.getByText(/2 files/)).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
    expect(planImport).toHaveBeenCalledWith(
      [expect.objectContaining({ relativePath: "a.md" })],
      { targetPath: "/" }
    );
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("My Notes");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("desc");

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({ name: "My Notes", description: "desc" });
    await waitFor(() => expect(runImport).toHaveBeenCalledTimes(1));

    expect(await screen.findByText("Import complete")).toBeInTheDocument();
    expect(screen.getByText(/Files:/).parentElement).toHaveTextContent("already existed 1");
    expect(screen.getByText("/b.md")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open filesystem" }));
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onFinished.mock.calls[0][0]).toMatchObject({
      filesystemId: "fs1",
      targetPath: "/",
      result: RESULT,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("into mode: no name field, shows the target, never creates a filesystem, Done reports the target", async () => {
    const onFinished = vi.fn();
    render(
      <FilesystemImportDialog
        open
        onOpenChange={vi.fn()}
        mode={{ kind: "into", filesystemId: "fsX", targetPath: "/docs" }}
        onFinished={onFinished}
      />
    );

    pickFolder();

    expect(await screen.findByText(/1 folder/)).toBeInTheDocument();
    expect(planImport).toHaveBeenCalledWith(expect.anything(), { targetPath: "/docs" });
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByText("/docs")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(runImport).toHaveBeenCalledTimes(1));
    expect(create).not.toHaveBeenCalled();

    // The client passed to runImport writes to the target filesystem.
    const client = runImport.mock.calls[0][1] as {
      createFolder: (p: string, d: string, c: boolean) => Promise<void>;
      createFile: (p: string, c: string, cp: boolean) => Promise<void>;
    };
    createFolder.mockResolvedValue({});
    createFile.mockResolvedValue({});
    await client.createFolder("/docs/x", "d", false);
    expect(createFolder).toHaveBeenCalledWith("fsX", {
      path: "/docs/x",
      description: "d",
      create_parents: undefined,
    });
    await client.createFile("/docs/x/a.md", "a", true);
    expect(createFile).toHaveBeenCalledWith("fsX", {
      path: "/docs/x/a.md",
      content: "a",
      create_parents: true,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onFinished.mock.calls[0][0]).toMatchObject({
      filesystemId: "fsX",
      targetPath: "/docs",
    });
  });
});
