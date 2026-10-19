import io
import re

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

# ─── Styling helpers ─────────────────────────────────────────────────────────

GOLD_FILL = PatternFill(start_color='B8861C', end_color='B8861C', fill_type='solid')
GREEN_FILL = PatternFill(start_color='1B4D3E', end_color='1B4D3E', fill_type='solid')
HEADER_FONT = Font(name='Arial', size=11, bold=True, color='FFFFFF')
ALIGN_CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
ALIGN_RIGHT = Alignment(horizontal='right', vertical='center', wrap_text=True)
THIN_BORDER = Border(
    left=Side(style='thin', color='CCCCCC'),
    right=Side(style='thin', color='CCCCCC'),
    top=Side(style='thin', color='CCCCCC'),
    bottom=Side(style='thin', color='CCCCCC'),
)

# ─── Column mapping for import ────────────────────────────────────────────────

# Maps Arabic/English header names → internal field names
COLUMN_MAP = {
    'الاسم الكامل': 'full_name',
    'الاسم': 'full_name',
    'full_name': 'full_name',
    'name': 'full_name',
    'الجنس': 'gender',
    'gender': 'gender',
    'sex': 'gender',
    'تاريخ الميلاد': 'date_of_birth',
    'date_of_birth': 'date_of_birth',
    'dob': 'date_of_birth',
    'رقم الهاتف': 'phone',
    'الهاتف': 'phone',
    'phone': 'phone',
    'mobile': 'phone',
    'هاتف ولي الأمر': 'guardian_phone',
    'guardian_phone': 'guardian_phone',
    'العنوان': 'address',
    'address': 'address',
    'الرقم القومي': 'national_id',
    'national_id': 'national_id',
    'المجموعة': 'group',
    'group': 'group',
    'المرحلة': 'stage',
    'stage': 'stage',
    'الفريق': 'team',
    'team': 'team',
    'الطابور': 'patrol',
    'الرهط': 'patrol',
    'patrol': 'patrol',
    'كود المرحلة': 'stage_code',
    'stage_code': 'stage_code',
    'code': 'stage_code',
}

GENDER_MAP = {
    'ذكر': 'M', 'م': 'M', 'm': 'M', 'male': 'M', '1': 'M',
    'أنثى': 'F', 'انثى': 'F', 'ف': 'F', 'f': 'F', 'female': 'F', '2': 'F',
}

DATE_FORMATS = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%d.%m.%Y']
EGYPTIAN_PHONE_RE = re.compile(r'^01[0-2,5]\d{8}$')


def _parse_date(value):
    """Try multiple date formats, return ISO string or None."""
    if not value:
        return None
    from datetime import datetime, date
    if isinstance(value, (datetime, date)):
        return value.strftime('%Y-%m-%d')
    s = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def _normalize_arabic(text: str) -> str:
    """Normalize Arabic text for comparison: collapse whitespace, normalize alef/ya."""
    if not text:
        return ''
    text = ' '.join(text.split())
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ى', 'ي').replace('ة', 'ه')
    return text.strip()


# ─── Import template download ─────────────────────────────────────────────────

def generate_import_template() -> bytes:
    """Return a downloadable Excel template with Arabic headers + one example row."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'قالب استيراد الأفراد'
    ws.sheet_view.rightToLeft = True

    headers = [
        'الاسم الكامل *', 'الجنس *\n(ذكر/أنثى)', 'تاريخ الميلاد\n(YYYY-MM-DD)',
        'رقم الهاتف\n(01XXXXXXXXX)', 'هاتف ولي الأمر', 'العنوان',
        'الرقم القومي\n(14 رقم)', 'المجموعة *', 'المرحلة *', 'الفريق *',
        'الطابور', 'كود المرحلة\n(للتحديث فقط)',
    ]
    ws.append(headers)
    for i, _ in enumerate(headers, 1):
        c = ws.cell(row=1, column=i)
        c.fill = GREEN_FILL
        c.font = HEADER_FONT
        c.alignment = ALIGN_CENTER
        c.border = THIN_BORDER

    example = [
        'مينا جرجس كامل', 'ذكر', '2010-05-15',
        '01012345678', '01123456789', 'شارع النصر، القاهرة',
        '30005150100123', 'المجموعة البحرية', 'مرحلة الكشاف', 'فريق النسور',
        'رهط الصقور', '',
    ]
    ws.append(example)
    for i, _ in enumerate(example, 1):
        c = ws.cell(row=2, column=i)
        c.alignment = ALIGN_RIGHT
        c.border = THIN_BORDER

    for col in ws.columns:
        max_len = max((len(str(c.value or '').split('\n')[0]) for c in col), default=10)
        ws.column_dimensions[openpyxl.utils.get_column_letter(col[0].column)].width = max(max_len + 4, 16)

    ws.row_dimensions[1].height = 40

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─── Export ──────────────────────────────────────────────────────────────────

def generate_sample_scout_excel() -> bytes:
    """Generates an Arabic-styled sample Excel file demonstrating RTL and Scout colors."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "كشف الأفراد"
    ws.sheet_view.rightToLeft = True

    header_fill = PatternFill(start_color="1B4332", end_color="1B4332", fill_type="solid")
    header_font = Font(name="Arial", size=12, bold=True, color="FFFFFF")
    align_center = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='CCCCCC'),
        right=Side(style='thin', color='CCCCCC'),
        top=Side(style='thin', color='CCCCCC'),
        bottom=Side(style='thin', color='CCCCCC'),
    )

    headers = ["المعرف الدائم", "كود المرحلة", "الاسم الرباعي", "المجموعة", "المرحلة", "الفريق", "الرهط", "حالة الحضور"]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = align_center

    sample_data = [
        ["MEM-001", "SC-27-A-001", "مينا جرجس كامل", "المجموعة البحرية", "مرحلة الكشاف", "فريق النسور", "رهط الصقور", "حاضر"],
        ["MEM-002", "SC-27-A-002", "مارينا سامي فهيم", "مجموعة المرشدات", "مرحلة المرشدات", "فريق الزهرات", "رهط الياسمين", "حاضر"],
        ["MEM-003", "SC-27-A-003", "بيشوي نبيل عازر", "المجموعة البحرية", "مرحلة المتقدم", "فريق الفهود", "رهط الأسود", "عذر"],
    ]

    for row_idx, row in enumerate(sample_data, start=2):
        ws.append(row)
        for col_num in range(1, len(row) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.alignment = align_center
            cell.border = thin_border

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_members_excel(members) -> bytes:
    """Export Member objects to styled Arabic RTL Excel."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'كشف الأفراد'
    ws.sheet_view.rightToLeft = True

    headers = [
        'الاسم الكامل', 'كود المرحلة', 'الجنس', 'المجموعة',
        'المرحلة', 'الفريق', 'الطابور', 'رقم الهاتف', 'هاتف ولي الأمر', 'نشط؟',
    ]
    ws.append(headers)
    for i, _ in enumerate(headers, 1):
        c = ws.cell(row=1, column=i)
        c.fill = GREEN_FILL
        c.font = HEADER_FONT
        c.alignment = ALIGN_CENTER
        c.border = THIN_BORDER

    for row_idx, m in enumerate(members, start=2):
        row_data = [
            m.full_name,
            m.stage_code or '',
            m.get_gender_display() if hasattr(m, 'get_gender_display') else m.gender,
            m.group.name if m.group else '',
            m.stage.name if m.stage else '',
            m.team.name if m.team else '',
            m.patrol.name if m.patrol else '',
            m.phone or '',
            m.guardian_phone or '',
            'نعم' if m.is_active else 'لا',
        ]
        ws.append(row_data)
        for i, _ in enumerate(row_data, 1):
            c = ws.cell(row=row_idx, column=i)
            c.alignment = ALIGN_RIGHT
            c.border = THIN_BORDER

    for col in ws.columns:
        max_len = max((len(str(c.value or '')) for c in col), default=10)
        ws.column_dimensions[openpyxl.utils.get_column_letter(col[0].column)].width = max(max_len + 4, 15)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─── Import parsing ───────────────────────────────────────────────────────────

def parse_members_excel(file_obj, custom_mapping: dict | None = None) -> list:
    """
    Parse uploaded Excel/CSV and return preview rows.
    custom_mapping: {col_index: field_name} — overrides auto-detect.
    Each row dict: {row_number, full_name, stage_code, action, errors, warnings, data}
    """
    try:
        wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
    except Exception as e:
        raise ValueError(f'لا يمكن قراءة الملف. تأكد أنه xlsx صحيح. ({e})')

    ws = wb.active
    all_rows = list(ws.rows)
    if not all_rows:
        return []

    # ── Build column mapping from header row ──────────────────────────────
    header_row = all_rows[0]
    col_map: dict[int, str] = {}  # col_index → field_name

    if custom_mapping:
        col_map = {int(k): v for k, v in custom_mapping.items()}
    else:
        for idx, cell in enumerate(header_row):
            raw = str(cell.value or '').strip().lower().replace('*', '').strip()
            # Try exact match first, then normalized Arabic match
            matched = COLUMN_MAP.get(raw) or COLUMN_MAP.get(raw.replace(' ', ''))
            if not matched:
                # Try Arabic normalization
                norm = _normalize_arabic(raw)
                for key, val in COLUMN_MAP.items():
                    if _normalize_arabic(key) == norm:
                        matched = val
                        break
            if matched:
                col_map[idx] = matched

    # ── Pre-load structure for name→id resolution ─────────────────────────
    from apps.structure.models import Group, Stage, Team, Patrol
    from apps.members.models import Member

    groups_by_name = {_normalize_arabic(g.name): g for g in Group.objects.filter(deleted_at__isnull=True)}
    stages_by_name = {_normalize_arabic(s.name): s for s in Stage.objects.filter(deleted_at__isnull=True)}
    teams_by_name = {_normalize_arabic(t.name): t for t in Team.objects.filter(deleted_at__isnull=True)}
    patrols_by_name = {_normalize_arabic(p.name): p for p in Patrol.objects.filter(deleted_at__isnull=True)}

    result = []
    for row_idx, row in enumerate(all_rows[1:], start=2):
        values = [cell.value for cell in row]
        if not any(v for v in values if v not in (None, '', ' ')):
            continue

        # Extract fields from mapping
        raw: dict[str, str] = {}
        for col_idx, field in col_map.items():
            if col_idx < len(values):
                raw[field] = str(values[col_idx]).strip() if values[col_idx] is not None else ''

        errors = []
        warnings = []
        resolved: dict = {}

        # ── full_name ──────────────────────────────────────────────────────
        full_name = ' '.join(raw.get('full_name', '').split())
        if not full_name:
            errors.append('الاسم الكامل مطلوب')
        else:
            resolved['full_name'] = full_name

        # ── gender ────────────────────────────────────────────────────────
        gender_raw = raw.get('gender', '').lower().strip()
        gender = GENDER_MAP.get(gender_raw)
        if gender_raw and not gender:
            errors.append(f'قيمة الجنس غير معروفة: "{raw.get("gender")}" — استخدم ذكر أو أنثى')
        elif gender:
            resolved['gender'] = gender

        # ── date_of_birth ─────────────────────────────────────────────────
        dob_raw = raw.get('date_of_birth', '')
        if dob_raw:
            dob = _parse_date(dob_raw)
            if dob:
                resolved['date_of_birth'] = dob
            else:
                errors.append(f'تاريخ الميلاد غير صالح: "{dob_raw}" — استخدم YYYY-MM-DD أو DD/MM/YYYY')

        # ── phone ─────────────────────────────────────────────────────────
        phone_raw = re.sub(r'\D', '', raw.get('phone', ''))
        if phone_raw:
            if EGYPTIAN_PHONE_RE.match(phone_raw):
                resolved['phone'] = phone_raw
            else:
                errors.append(f'رقم الهاتف غير صحيح: "{raw.get("phone")}"')

        # ── guardian_phone ────────────────────────────────────────────────
        gphone_raw = re.sub(r'\D', '', raw.get('guardian_phone', ''))
        if gphone_raw:
            if EGYPTIAN_PHONE_RE.match(gphone_raw):
                resolved['guardian_phone'] = gphone_raw
            else:
                errors.append(f'هاتف ولي الأمر غير صحيح: "{raw.get("guardian_phone")}"')

        # ── national_id ───────────────────────────────────────────────────
        nid_raw = re.sub(r'\D', '', raw.get('national_id', ''))
        if nid_raw:
            if len(nid_raw) == 14:
                resolved['national_id'] = nid_raw
            else:
                errors.append(f'الرقم القومي يجب أن يكون 14 رقماً (تم إدخال {len(nid_raw)})')

        if raw.get('address'):
            resolved['address'] = raw['address']

        # ── structure resolution ──────────────────────────────────────────
        group_obj = stage_obj = team_obj = patrol_obj = None

        group_raw = raw.get('group', '')
        if group_raw:
            group_obj = groups_by_name.get(_normalize_arabic(group_raw))
            if group_obj:
                resolved['group'] = str(group_obj.pk)
            else:
                errors.append(f'المجموعة "{group_raw}" غير موجودة في النظام')

        stage_raw = raw.get('stage', '')
        if stage_raw:
            stage_obj = stages_by_name.get(_normalize_arabic(stage_raw))
            if stage_obj:
                resolved['stage'] = str(stage_obj.pk)
            else:
                errors.append(f'المرحلة "{stage_raw}" غير موجودة في النظام')

        team_raw = raw.get('team', '')
        if team_raw:
            team_obj = teams_by_name.get(_normalize_arabic(team_raw))
            if team_obj:
                resolved['team'] = str(team_obj.pk)
            else:
                errors.append(f'الفريق "{team_raw}" غير موجود في النظام')

        patrol_raw = raw.get('patrol', '')
        if patrol_raw:
            patrol_obj = patrols_by_name.get(_normalize_arabic(patrol_raw))
            if patrol_obj:
                resolved['patrol'] = str(patrol_obj.pk)
            else:
                warnings.append(f'الطابور "{patrol_raw}" غير موجود — سيتم تجاهله')

        # ── stage_code / dedup ────────────────────────────────────────────
        stage_code = raw.get('stage_code', '').strip() or None
        action = 'CREATE'

        if stage_code:
            existing = Member.objects.filter(stage_code=stage_code).first()
            if existing:
                action = 'UPDATE'
                resolved['stage_code'] = stage_code
            else:
                resolved['stage_code'] = stage_code
        else:
            # Check name + dob duplicate
            if full_name and resolved.get('date_of_birth'):
                norm_name = _normalize_arabic(full_name)
                dup = Member.objects.filter(
                    date_of_birth=resolved['date_of_birth']
                ).select_related()
                for m in dup:
                    if _normalize_arabic(m.full_name) == norm_name:
                        warnings.append(f'يوجد فرد بنفس الاسم وتاريخ الميلاد (ID: {str(m.pk)[:8]}...) — قد يكون تكراراً')
                        action = 'CONFLICT'
                        break

        if errors:
            action = 'ERROR'

        result.append({
            'row_number': row_idx,
            'full_name': full_name or f'صف {row_idx}',
            'stage_code': stage_code,
            'action': action,
            'errors': errors,
            'warnings': warnings,
            'data': resolved,
        })

    return result


def generate_errors_excel(error_rows: list) -> bytes:
    """Generate Excel file containing only the error rows with reasons."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'الصفوف المرفوضة'
    ws.sheet_view.rightToLeft = True

    headers = ['رقم الصف', 'الاسم', 'كود المرحلة', 'الحالة', 'الأخطاء']
    ws.append(headers)
    for i, _ in enumerate(headers, 1):
        c = ws.cell(row=1, column=i)
        c.fill = PatternFill(start_color='B91C1C', end_color='B91C1C', fill_type='solid')
        c.font = HEADER_FONT
        c.alignment = ALIGN_CENTER

    for r in error_rows:
        ws.append([
            r.get('row_number', ''),
            r.get('full_name', ''),
            r.get('stage_code', '') or '',
            r.get('action', ''),
            ' | '.join(r.get('errors', [])),
        ])

    for col in ws.columns:
        max_len = max((len(str(c.value or '')) for c in col), default=10)
        ws.column_dimensions[openpyxl.utils.get_column_letter(col[0].column)].width = max(max_len + 4, 15)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
