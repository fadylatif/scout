from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import ReportTemplate, ReportLog
from .serializers import ReportTemplateSerializer, ReportLogSerializer
from apps.users.permissions import BaseScopedPermission
from apps.common.services.excel import export_members_excel

class ReportTemplateViewSet(viewsets.ModelViewSet):
    """
    إدارة قوالب التقارير
    """
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

class ReportViewSet(viewsets.ViewSet):
    """
    توليد التقارير وتصديرها
    """
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    @action(detail=False, methods=['get'], url_path='generate-members')
    def generate_members_report(self, request):
        """
        توليد تقرير أعضاء (Excel) بناءً على الفلاتر
        """
        from apps.members.models import Member

        # Simple filter extraction
        stage_id = request.query_params.get('stage')
        team_id = request.query_params.get('team')

        qs = Member.objects.filter(deleted_at__isnull=True)
        if stage_id:
            qs = qs.filter(stage_id=stage_id)
        if team_id:
            qs = qs.filter(team_id=team_id)

        excel_bytes = export_members_excel(list(qs))

        # Log the report generation
        ReportLog.objects.create(
            user=request.user,
            parameters={'stage': stage_id, 'team': team_id},
            template_id=None # Or link to a default template
        )

        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="members_report.xlsx"'
        return response

    @action(detail=False, methods=['get'], url_path='logs')
    def report_logs(self, request):
        """
        عرض سجل التقارير التي تم توليدها
        """
        logs = ReportLog.objects.all().order_by('-created_at')
        serializer = ReportLogSerializer(logs, many=True)
        return Response(serializer.data)
