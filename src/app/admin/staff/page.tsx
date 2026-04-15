"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Users,
  X,
  FolderKanban,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Staff {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface StaffFormData {
  name: string;
  department: string;
  position: string;
}

/** GET /api/staff/groups 응답 형태 */
interface StaffGroupApi {
  id: string;
  name: string;
  sortOrder: number;
  members: { staffId: string; staff: Staff }[];
}

const EMPTY_FORM: StaffFormData = { name: "", department: "", position: "" };

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewData, setPreviewData] = useState<StaffFormData[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<StaffGroupApi[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStaffList(data);
    } catch {
      toast.error("직원 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/staff/groups", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroups(data);
    } catch {
      toast.error("맞춤 그룹 목록을 불러오는데 실패했습니다.");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchGroups();
  }, [fetchStaff, fetchGroups]);

  function openNewGroupDialog() {
    setEditingGroupId(null);
    setGroupName("");
    setGroupMemberIds([]);
    setGroupDialogOpen(true);
  }

  function openEditGroupDialog(g: StaffGroupApi) {
    setEditingGroupId(g.id);
    setGroupName(g.name);
    setGroupMemberIds(g.members.map((m) => m.staffId));
    setGroupDialogOpen(true);
  }

  function toggleGroupMember(staffId: string) {
    setGroupMemberIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId],
    );
  }

  /** 부서(학년) 단위로 그룹 멤버 일괄 추가 */
  function addDepartmentMembers(dept: string) {
    const ids = staffList
      .filter((s) => s.department === dept)
      .map((s) => s.id);
    setGroupMemberIds((prev) => [...new Set([...prev, ...ids])]);
  }

  function removeDepartmentMembers(dept: string) {
    const idSet = new Set(
      staffList.filter((s) => s.department === dept).map((s) => s.id),
    );
    setGroupMemberIds((prev) => prev.filter((id) => !idSet.has(id)));
  }

  async function handleSaveGroup() {
    const name = groupName.trim();
    if (!name) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }

    setGroupSaving(true);
    try {
      const isEdit = editingGroupId !== null;
      const res = await fetch("/api/staff/groups", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: editingGroupId, name, staffIds: groupMemberIds }
            : { name, staffIds: groupMemberIds },
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "저장 실패");
      }
      toast.success(isEdit ? "그룹이 수정되었습니다." : "그룹이 생성되었습니다.");
      setGroupDialogOpen(false);
      fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setGroupSaving(false);
    }
  }

  async function handleDeleteGroup(g: StaffGroupApi) {
    if (!confirm(`"${g.name}" 그룹을 삭제할까요?`)) return;
    try {
      const res = await fetch("/api/staff/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: g.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "삭제 실패");
      }
      toast.success("그룹이 삭제되었습니다.");
      fetchGroups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  }

  // --- Add / Edit ---
  function openAddDialog() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditDialog(staff: Staff) {
    setEditingId(staff.id);
    setFormData({
      name: staff.name,
      department: staff.department,
      position: staff.position,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.department.trim()) {
      toast.error("이름과 부서는 필수 항목입니다.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const res = await fetch("/api/staff", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit ? { id: editingId, ...formData } : formData
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(isEdit ? "직원 정보가 수정되었습니다." : "직원이 등록되었습니다.");
      setFormOpen(false);
      fetchStaff();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  // --- Delete ---
  function openDeleteDialog(staff: Staff) {
    setDeletingStaff(staff);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deletingStaff) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingStaff.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(`${deletingStaff.name} 님이 삭제되었습니다.`);
      setDeleteOpen(false);
      setDeletingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다."
      );
    } finally {
      setDeleting(false);
    }
  }

  // --- Excel Upload ---
  async function handleFileSelect(file: File) {
    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      toast.error("엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/staff/upload?preview=true", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      setPreviewData(data.staff);
      toast.success(`${data.count}명의 데이터를 읽었습니다.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "파일 처리에 실패했습니다."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadConfirm() {
    if (!previewData) return;

    setUploading(true);
    try {
      const res = await fetch("/api/staff/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff: previewData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const data = await res.json();
      toast.success(`${data.count}명의 직원이 등록되었습니다.`);
      setUploadOpen(false);
      setPreviewData(null);
      fetchStaff();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "등록에 실패했습니다."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  const departments = [...new Set(staffList.map((s) => s.department))].sort();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">직원 관리</h1>
          <p className="mt-2 text-lg font-light text-muted-foreground">
            직원 정보를 등록, 수정, 삭제할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/staff/upload/template"
            download
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
          >
            <Download className="size-4" />
            샘플 다운로드
          </a>
          <Button variant="outline" onClick={() => { setPreviewData(null); setUploadOpen(true); }}>
            <Upload className="size-4" />
            엑셀 업로드
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="size-4" />
            직원 추가
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              전체 직원
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffList.length}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              부서 수
            </CardTitle>
            <FileSpreadsheet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}개</div>
          </CardContent>
        </Card>
      </div>

      {/* 맞춤 그룹: 세션 대상 일괄 선택·주문 화면 그룹 보기에 사용 */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-5 text-muted-foreground" />
            <CardTitle>맞춤 그룹</CardTitle>
          </div>
          <Button size="sm" onClick={openNewGroupDialog}>
            <Plus className="size-4" />
            그룹 추가
          </Button>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 그룹이 없습니다. 팀·동아리 등 원하는 단위로 묶어 두면 세션
              생성 시 일괄 선택할 수 있습니다.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      멤버 {g.members.length}명
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditGroupDialog(g)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteGroup(g)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>직원 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              불러오는 중...
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Users className="size-10 opacity-50" />
              <p>등록된 직원이 없습니다.</p>
              <p className="text-xs">직원을 추가하거나 엑셀 파일을 업로드해 주세요.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직위</TableHead>
                  <TableHead className="w-[120px] text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staff, idx) => (
                  <TableRow key={staff.id}>
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{staff.department}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {staff.position || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(staff)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDeleteDialog(staff)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "직원 정보 수정" : "직원 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">부서 *</Label>
              <Input
                id="department"
                placeholder="1학년"
                value={formData.department}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">직위</Label>
              <Input
                id="position"
                placeholder="교사"
                value={formData.position}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    position: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : editingId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>직원 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {deletingStaff?.name}
            </span>{" "}
            님을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setPreviewData(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>엑셀 파일 업로드</DialogTitle>
          </DialogHeader>

          {previewData === null ? (
            <>
              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <FileSpreadsheet className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    파일을 여기에 끌어다 놓거나
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    .xlsx, .xls, .csv 파일 지원
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "처리 중..." : "파일 선택"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  첫 번째 시트에 <strong>이름</strong>,{" "}
                  <strong>부서(학년)</strong>, <strong>직위</strong> 열을 그대로
                  두고 아래 행에만 데이터를 입력하세요. (
                  <strong>부서</strong> 열 이름도 인식합니다.)
                </p>
                <a
                  href="/api/staff/upload/template"
                  download
                  className={cn(
                    buttonVariants({ variant: "link", size: "xs" }),
                    "h-auto shrink-0 px-0 text-xs"
                  )}
                >
                  <Download className="mr-1 inline size-3.5 align-text-bottom" />
                  샘플 파일 받기
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  총 <strong className="text-foreground">{previewData.length}명</strong>의
                  데이터를 미리보기합니다.
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewData(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>직위</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.department}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.position || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreviewData(null)}
                  disabled={uploading}
                >
                  다시 선택
                </Button>
                <Button onClick={handleUploadConfirm} disabled={uploading}>
                  {uploading ? "등록 중..." : `${previewData.length}명 등록`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 맞춤 그룹 추가·수정: 부서 단위 일괄 선택 + 개별 체크 */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-4 pt-4 pr-12 pb-3">
            <DialogTitle>
              {editingGroupId ? "맞춤 그룹 수정" : "맞춤 그룹 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">그룹 이름</Label>
              <Input
                id="group-name"
                placeholder="예: 음악부, 3학년 국어팀"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              아래에서 부서(학년)로 한꺼번에 넣거나, 직원을 개별 체크하세요.
            </p>
            <div className="max-h-[min(45vh,320px)] overflow-y-auto rounded-lg border bg-muted/20 p-2">
              {staffList.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  등록된 직원이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {departments.map((dept) => {
                    const members = staffList.filter(
                      (s) => s.department === dept,
                    );
                    return (
                      <div key={dept}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {dept}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="h-7 text-xs"
                              onClick={() => addDepartmentMembers(dept)}
                            >
                              부서 전체 추가
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="h-7 text-xs"
                              onClick={() => removeDepartmentMembers(dept)}
                            >
                              부서 전체 제거
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-1.5">
                          {members.map((s) => (
                            <label
                              key={s.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-background/80"
                            >
                              <Checkbox
                                checked={groupMemberIds.includes(s.id)}
                                onCheckedChange={() => toggleGroupMember(s.id)}
                              />
                              <span className="text-sm">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              선택된 멤버 {groupMemberIds.length}명
            </p>
          </div>
          <DialogFooter className="!mx-0 !mb-0 shrink-0 border-t bg-background px-4 py-3">
            <Button
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}
              disabled={groupSaving}
            >
              취소
            </Button>
            <Button onClick={handleSaveGroup} disabled={groupSaving}>
              {groupSaving ? "저장 중..." : editingGroupId ? "저장" : "만들기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
