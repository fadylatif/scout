import io
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

def generate_sample_scout_excel() -> bytes:
    """Generates an Arabic-styled sample Excel file demonstrating RTL and Scout colors."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "كشف الأفراد"
    ws.sheet_view.rightToLeft = True

    # Styling headers
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

    # Sample rows
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

    # Adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
