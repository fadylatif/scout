# Implementation Plan — Unit 1: Add/Edit Forms & Structure Management

**Worktree:** `d:\scout system\.worktrees\unit-1`  
**Branch:** `feature/unit-1-forms`  
**Backend test command:** `.\.venv\Scripts\pytest.exe backend\apps\members\tests\ backend\apps\structure\tests\ -v` (run from repo root)  
**Frontend build command:** `cd frontend; npm run build` (from worktree root)

---

## Architecture Decisions

**Decision 1 — Validation centralisation (backend):** Phone validation (`^(01)[0-2,5]{1}[0-9]{8}$`), national_id (14 digits, checked post-decrypt), and photo size (≤10 MB, magic-bytes verified) are enforced in `MemberWriteSerializer.validate_*` methods. The view never duplicates this logic. Rationale: `MemberCreateUpdateSerializer` already validates photo; adding phone/national_id there is the natural place.

**Decision 2 — Permission check pattern:** `MemberListCreateView` and all structure views already use `IsAuthenticated`/`IsAdminOrReadOnly`. Unit 1 will add a helper `_check_perm(user, module, action)` that reads `user.permission.permissions[module][action]` (or `True` for ADMIN) and raises `PermissionDenied` early in `perform_create`/`perform_update`/`perform_destroy`. The QuerySet scope filter already narrows the data; the permission check only guards write actions. No new permission class needed — keeping it in the view keeps it readable.

**Decision 3 — national_id storage:** The model already has `national_id_encrypted` (Fernet). The write serializer accepts `national_id` plaintext, validates length=14, encrypts it before save, and never returns it in read serializers. This matches the established `crypto.py` service.

**Decision 4 — stage_code refresh on stage change:** When a PATCH changes `stage_id`, `perform_update` in `MemberDetailView` (a) saves the current `stage_code` to `MemberCodeHistory`, (b) sets `member.stage_code = None` so `Member.save()` regenerates it. This mirrors the existing `MemberTransferView` pattern.

**Decision 5 — Soft-delete confirmation flow:** Calling `DELETE /api/members/:id/` performs a logical delete (`SoftDeleteModel.delete()`). The frontend shows a `ConfirmDeleteDialog` before calling this endpoint. No separate endpoint is needed.

**Decision 6 — Modal vs full-screen:** `MemberFormModal` uses `@radix-ui/react-dialog` (already in `package.json`). Below `md` breakpoint (768 px as defined in `tailwind.config.js`), the Dialog content is stretched to full viewport via Tailwind responsive classes. `max-w-2xl` on desktop.

**Decision 7 — Cascading selects:** Client side. On group selection, call `/api/stages/?group=<id>` to populate stages; on stage selection, call `/api/teams/?stage=<id>`. These endpoints already exist in `structureApi`. No backend changes needed for cascade.

**Decision 8 — Zod schema location:** One file `frontend/src/lib/validations/member.ts` holds all member zod schemas. Structure schemas go in `frontend/src/lib/validations/structure.ts`. Keeps validation close to types.

---

## Plan Items

- [ ] 1. **Backend — Add write validators to `MemberCreateUpdateSerializer`**  
      Add `validate_phone`, `validate_guardian_phone`, and `validate_national_id` methods; accept `national_id` (write-only plain text), encrypt it via `common.services.crypto`, and store in `national_id_encrypted`. Add missing field `national_id` (write-only) and `custom_values` (writeable nested, create/update `CustomFieldValue` rows in `update()`/`create()`).  
      Files: `backend/apps/members/serializers.py`  
      Verify: `pytest backend/apps/members/tests/test_serializers.py -v` — new tests pass (item 4 creates them).

- [ ] 2. **Backend — Add permission check helper and enforce it in MemberListCreateView and MemberDetailView**  
      Add `_check_member_perm(user, action)` (reads `user.permission.permissions.get('members', {}).get(action, user.role == 'ADMIN')`). Call it in `perform_create` (checks `add`), `perform_update` (checks `change`), `perform_destroy` (checks `delete`). ADMIN always passes.  
      Also add the same guard for `CustomFieldListCreateView` and `CustomFieldDetailView` using module key `'custom_fields'`.  
      Files: `backend/apps/members/views.py`  
      Verify: `pytest backend/apps/members/tests/test_permissions.py -v` (item 4 creates these).

- [ ] 3. **Backend — Add AuditLog with old_values/new_values to structure views and improve member views**  
      Structure views (`GroupDetailView`, `StageDetailView`, `TeamDetailView`, `PatrolDetailView`, `ScoutYearDetailView`) currently have no audit logging on create/update/delete. Add `perform_create`, `perform_update`, `perform_destroy` overrides that call `AuditLog.objects.create(...)` mirroring the existing pattern in `MemberDetailView`. For update, capture `old_values` before save.  
      Also: `MemberDetailView.perform_update` must detect stage change and archive old `stage_code` to `MemberCodeHistory` before calling `serializer.save()`.  
      Files: `backend/apps/structure/views.py`, `backend/apps/members/views.py`  
      Verify: `pytest backend/apps/members/tests/test_audit.py backend/apps/structure/tests/test_audit.py -v` (item 4 creates them).

- [ ] 4. **Backend — Write pytest tests for Unit 1**  
      Create two test modules:  
      - `backend/apps/members/tests/__init__.py` (create if missing), `backend/apps/members/tests/test_members_unit1.py`: tests for:
        - Valid member POST → 201 + `stage_code` generated + `qr_image` present  
        - `phone` in wrong format → 400 with Arabic error message  
        - `national_id` with 13 chars → 400  
        - `national_id` with 14 chars → 201 + stored encrypted  
        - PATCH changing `stage` → old code archived in `MemberCodeHistory`, new `stage_code` assigned  
        - User without `members.add=True` permission → 403  
        - User without `members.delete=True` permission → 403 on DELETE  
        - AuditLog row created on create with `new_values` not null  
        - AuditLog row created on update with `old_values` and `new_values`  
        - AuditLog row created on delete  
      - `backend/apps/structure/tests/__init__.py`, `backend/apps/structure/tests/test_structure_unit1.py`: tests for:
        - Group create → 201 + AuditLog  
        - Stage create with `group` FK → 201 + AuditLog  
        - Soft-delete of Group → 204 + `deleted_at` set + AuditLog  
        - Non-admin POST on group → 403  
      Files: `backend/apps/members/tests/__init__.py`, `backend/apps/members/tests/test_members_unit1.py`, `backend/apps/structure/tests/__init__.py`, `backend/apps/structure/tests/test_structure_unit1.py`  
      Verify: `.\.venv\Scripts\pytest.exe backend/apps/members/tests/test_members_unit1.py backend/apps/structure/tests/test_structure_unit1.py -v` — all pass.

- [ ] 5. **Backend — Add `CustomFieldValue` write support to member create/update (serializer + API)**  
      `MemberCreateUpdateSerializer` should accept `custom_values: [{custom_field: uuid, value: str}]` as a writable nested field. In `create()`, call `Member.save()` then bulk-create `CustomFieldValue` rows. In `update()`, upsert (update_or_create). Mark field `required=False`.  
      This is part of serializers.py; pulling it out as a separate step because the nested write logic is non-trivial.  
      Files: `backend/apps/members/serializers.py`  
      Verify: The test in `test_members_unit1.py` that posts a member with `custom_values` returns 201 and creates `CustomFieldValue` rows. Run `pytest backend/apps/members/tests/test_members_unit1.py -v`.

- [ ] 6. **Frontend — Add Zod schemas with Arabic error messages**  
      Create `frontend/src/lib/validations/member.ts` with a Zod schema for all member form fields:  
      - `full_name`: min 2 chars → "الاسم مطلوب ولا يقل عن حرفين"  
      - `gender`: enum M/F → "يرجى تحديد الجنس"  
      - `phone`: optional, regex Egyptian → "رقم الهاتف غير صحيح (مثال: 01012345678)"  
      - `guardian_phone`: same as phone, optional  
      - `date_of_birth`: optional string, valid ISO date  
      - `national_id`: optional string, exactly 14 digits when provided → "الرقم القومي يجب أن يكون 14 رقمًا"  
      - `photo`: optional File, ≤10 MB → "حجم الصورة يتجاوز 10 ميجابايت"  
      - `group`, `stage`, `team`, `patrol`, `scout_year`: optional UUIDs  
      Create `frontend/src/lib/validations/structure.ts` with simple schemas for Group (name required), Stage (name + group required), Team (name + stage required), Patrol (name + team required), ScoutYear (name + start_date + end_date required).  
      Files: `frontend/src/lib/validations/member.ts` (create), `frontend/src/lib/validations/structure.ts` (create)  
      Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 7. **Frontend — Create `MemberFormModal` component**  
      Location: `frontend/src/components/members/MemberFormModal.tsx`  
      Behaviour:
      - Uses `@radix-ui/react-dialog` for the modal shell. On `<md` breakpoint: `fixed inset-0` full-screen with a close button. On `≥md`: centered `max-w-2xl` dialog.
      - Uses `react-hook-form` + `@hookform/resolvers/zod` with the schema from item 6.
      - Fields: `full_name` (Input), `gender` (Radix Select), `date_of_birth` (Input type="date"), `phone` (Input), `guardian_phone` (Input), `address` (textarea styled like Input), `national_id` (Input, optional), `photo` (file input with image preview via `URL.createObjectURL`).
      - Cascading selects: group (fetches `/api/groups/`), stage (fetches `/api/stages/?group=<id>` when group changes, clears on group change), team (fetches `/api/teams/?stage=<id>`), patrol (fetches `/api/patrols/?team=<id>`), scout_year (fetches `/api/scout-years/`). Use `useState` + `useEffect` for each cascade level.
      - Custom fields section: fetches `GET /api/custom-fields/?group=<groupId>` after group is selected; renders a text/date/number/boolean/select input per field.
      - Submit: builds a `FormData`, calls `membersApi.create(fd)` (POST) or `membersApi.update(id, fd)` (PATCH). On success calls `onSuccess()` prop, on error maps Django field errors to `setError()`.
      - Props: `open: boolean`, `onClose: () => void`, `onSuccess: () => void`, `member?: Member` (edit mode pre-fills all fields).
      - Uses existing ui components: `Button`, `Input`, `Spinner` for loading states.  
      Files: `frontend/src/components/members/MemberFormModal.tsx` (create), `frontend/src/components/members/index.ts` (create barrel export)  
      Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 8. **Frontend — Create `ConfirmDeleteDialog` component**  
      Location: `frontend/src/components/shared/ConfirmDeleteDialog.tsx`  
      Uses `@radix-ui/react-dialog`. Accepts `open`, `onClose`, `onConfirm`, `title`, `description`. Shows a danger-variant confirmation with `Button variant="danger"` ("نعم، احذف") and a cancel `Button variant="outline"`. Passes 44 px minimum touch target.  
      Files: `frontend/src/components/shared/ConfirmDeleteDialog.tsx` (create)  
      Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 9. **Frontend — Create Structure form modals: `StructureFormModal`**  
      One multi-purpose modal at `frontend/src/components/structure/StructureFormModal.tsx`. The `entity` prop (`'group'|'stage'|'team'|'patrol'|'scout_year'`) switches which fields render and which API endpoint is called. Uses the schemas from `structure.ts` (item 6).  
      - Group: name (Input), type (Radix Select: SCOUT/GUIDE/NAVAL), description (textarea).  
      - Stage: name (Input), group (Select from `/api/groups/`), order (number Input).  
      - Team: name (Input), stage (Select from `/api/stages/`), sector (optional Select `/api/sectors/?group=<...>`), description (textarea).  
      - Patrol: name (Input), team (Select from `/api/teams/`).  
      - ScoutYear: name (Input), start_date (date Input), end_date (date Input), is_active (Radix Switch/Checkbox).  
      API calls use `structureApi`; add missing CRUD methods to `frontend/src/api/structure.ts`:
      - `createGroup`, `updateGroup`, `deleteGroup`  
      - `createStage`, `updateStage`, `deleteStage`  
      - `createPatrol`, `updatePatrol`, `deletePatrol`  
      - `createScoutYear`, `updateScoutYear`, `deleteScoutYear`  
      (Team CRUD already exists in `structureApi`.)  
      Files: `frontend/src/components/structure/StructureFormModal.tsx` (create), `frontend/src/components/structure/index.ts` (barrel), `frontend/src/api/structure.ts` (modify — add missing CRUD calls)  
      Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 10. **Frontend — Update `MembersPage` with Edit/Delete per row (permission-gated)**  
       Import `MemberFormModal` and `ConfirmDeleteDialog`. Add state: `editingMember: Member | null`, `deletingMember: Member | null`.  
       In the actions column, render two icon buttons — `Pencil` (edit) and `Trash2` (delete) — guarded by checking `authUser.role === 'ADMIN' || authUser.permission?.permissions?.members?.change` and `...members?.delete` respectively. Clicking edit opens `MemberFormModal` with `member` prop. Clicking delete opens `ConfirmDeleteDialog`; on confirm calls `membersApi.delete(id)`, then calls `fetchMembers()` to refresh.  
       Also wire the existing "فرد جديد" button (currently a `<Link to="/members/new">`) to instead `setEditingMember(null); setCreateOpen(true)` to open `MemberFormModal` without navigating away. Keep the route `/members/new` pointing to `MembersPage` as redirect for now (or remove the route if cleaner — decision: keep it and open modal on mount when path is `/members/new`).  
       Files: `frontend/src/pages/members/MembersPage.tsx` (modify)  
       Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 11. **Frontend — Update `StructurePage` with Add/Edit/Delete per structure item**  
       Import `StructureFormModal` and `ConfirmDeleteDialog`.  
       - Add a top-level "مجموعة جديدة" button (ADMIN only) that opens `StructureFormModal entity="group"`.  
       - In `StageSection` header, add an edit (Pencil) and delete (Trash2) icon button visible to ADMIN only.  
       - In `TeamRow`, add edit/delete icon buttons, also ADMIN-only (structure management is restricted to ADMIN per `IsAdminOrReadOnly` backend rule).  
       - Add an "إضافة مرحلة" button in each group card (ADMIN), "إضافة فريق" in each stage, "إضافة رهط" in each team row.  
       - For each entity type, on delete: call the respective `structureApi.delete*` method; on success refresh by re-fetching `structureApi.groupTree()`.  
       - Add a `ScoutYear` management panel: a collapsible section at the top listing years from `structureApi.scoutYears()` with add/edit/delete buttons.  
       Files: `frontend/src/pages/structure/StructurePage.tsx` (modify)  
       Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 12. **Frontend — Register `/members/new` route to open modal (App.tsx)**  
       Change the existing route so `/members/new` renders `MembersPage` with a `?new=1` search param that `MembersPage` reads on mount to auto-open `MemberFormModal`. Remove the dead `<Link to="/members/new">` in `MembersPage` header and replace with a `Button` that directly sets `createOpen=true`.  
       Files: `frontend/src/App.tsx` (modify — simplify route), `frontend/src/pages/members/MembersPage.tsx` (remove `/members/new` Link, already done in item 10)  
       Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 13. **Frontend — Add missing type exports for custom fields**  
       Add `CustomField`, `CustomFieldValue` types to `frontend/src/types/index.ts` so `MemberFormModal` and `CustomFieldListCreateView` can be typed without `any`.  
       Also add `membersApi.customFields(groupId?: string)` to `frontend/src/api/members.ts`.  
       Files: `frontend/src/types/index.ts` (modify), `frontend/src/api/members.ts` (modify)  
       Verify: `cd frontend; npm run build` — 0 TS errors.

- [ ] 14. **Full verification pass**  
       Run all backend Unit 1 tests together:  
       `.\.venv\Scripts\pytest.exe backend/apps/members/tests/test_members_unit1.py backend/apps/structure/tests/test_structure_unit1.py backend/apps/common/tests/test_smoke.py -v`  
       — all tests green, smoke tests still pass.  
       Run frontend build:  
       `cd frontend; npm run build`  
       — exits 0, 0 TS errors, no console errors.  
       Files: no changes — this is a verification step.  
       Verify: Both commands exit with code 0.

- [ ] 15. **Record decisions in `docs/DECISIONS.md`**  
       Append the Unit 1 architecture decisions (items 1–8 in the decisions section above) to the worktree's `docs/DECISIONS.md`.  
       Files: `docs/DECISIONS.md` (worktree path: `d:\scout system\.worktrees\unit-1\docs\DECISIONS.md`)  
       Verify: File updated; `git diff docs/DECISIONS.md` shows new content.

---

## File Map

| Action | Path (relative to worktree root) |
|--------|----------------------------------|
| MODIFY | `backend/apps/members/serializers.py` |
| MODIFY | `backend/apps/members/views.py` |
| MODIFY | `backend/apps/structure/views.py` |
| CREATE | `backend/apps/members/tests/__init__.py` |
| CREATE | `backend/apps/members/tests/test_members_unit1.py` |
| CREATE | `backend/apps/structure/tests/__init__.py` |
| CREATE | `backend/apps/structure/tests/test_structure_unit1.py` |
| CREATE | `frontend/src/lib/validations/member.ts` |
| CREATE | `frontend/src/lib/validations/structure.ts` |
| CREATE | `frontend/src/components/members/MemberFormModal.tsx` |
| CREATE | `frontend/src/components/members/index.ts` |
| CREATE | `frontend/src/components/shared/ConfirmDeleteDialog.tsx` |
| CREATE | `frontend/src/components/structure/StructureFormModal.tsx` |
| CREATE | `frontend/src/components/structure/index.ts` |
| MODIFY | `frontend/src/api/structure.ts` |
| MODIFY | `frontend/src/api/members.ts` |
| MODIFY | `frontend/src/types/index.ts` |
| MODIFY | `frontend/src/pages/members/MembersPage.tsx` |
| MODIFY | `frontend/src/pages/structure/StructurePage.tsx` |
| MODIFY | `frontend/src/App.tsx` |
| MODIFY | `docs/DECISIONS.md` |

---

## Key Constraints (enforced throughout)

1. **Design tokens MUST NOT change** — `frontend/src/styles/tokens.css` and `frontend/tailwind.config.js` are read-only for this unit.
2. **Existing UI components only** — use `Button`, `Input`, `Card`, `Badge`, `Spinner` from `src/components/ui/`; use `@radix-ui/react-dialog`, `@radix-ui/react-select` from `package.json` (already installed).
3. **All permission checks on backend** — the frontend hides buttons but the view enforces `403`.
4. **Soft-delete only** — `DELETE` endpoints call `instance.delete()` (SoftDeleteModel), not `hard_delete()`.
5. **AuditLog on every create/update/delete** — mirror the pattern already in `MemberListCreateView.perform_create`.
6. **Stage code archived on stage change** — `MemberCodeHistory` row written before `stage_code = None` reset.
7. **national_id encrypted at rest** — never stored plain, never returned in read serializers.
