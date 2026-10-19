
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import generics, status, views
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.models import AuditLog
from apps.common.services.excel import (
    export_members_excel,
    generate_errors_excel,
    generate_import_template,
    parse_members_excel,
)
from apps.members.models import (
    CustomField,
    Member,
    MemberCodeHistory,
    MemberTransferLog,
)
from apps.members.serializers import (
    CustomFieldSerializer,
    MemberCreateUpdateSerializer,
    MemberDetailSerializer,
    MemberListSerializer,
    MemberTransferSerializer,
    _check_perm,
)


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _scope_members_qs(qs, user):
    """Filter queryset to user's scope unless ADMIN."""
    if user.role == 'ADMIN':
        return qs
    team_ids = set(user.scope_accesses.filter(scope_type='TEAM').values_list('scope_id', flat=True))
    stage_ids = set(user.scope_accesses.filter(scope_type='STAGE').values_list('scope_id', flat=True))
    patrol_ids = set(user.scope_accesses.filter(scope_type='PATROL').values_list('scope_id', flat=True))
    if team_ids or stage_ids or patrol_ids:
        return qs.filter(
            Q(team_id__in=team_ids) |
            Q(stage_id__in=stage_ids) |
            Q(patrol_id__in=patrol_ids)
        )
    # No scope assigned → see nothing
    return qs.none()


class MemberListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['group', 'stage', 'team', 'patrol', 'gender', 'is_active', 'scout_year']
    search_fields = ['full_name', 'stage_code', 'phone']
    ordering_fields = ['full_name', 'stage_code', 'created_at']
    ordering = ['full_name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MemberCreateUpdateSerializer
        return MemberListSerializer
        _check_perm(self.request.user, 'members', 'view')
        qs = Member.objects.filter(deleted_at__isnull=True).select_related(
            'group', 'stage', 'team', 'patrol'
        )
        return _scope_members_qs(qs, self.request.user)

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'members', 'add')
        member = serializer.save()
        AuditLog.objects.create(
            action='CREATE',
            user=self.request.user,
            entity_type='Member',
            entity_id=str(member.pk),
            description=str(member),
            ip_address=_get_client_ip(self.request) or None,
            new_values={
                'full_name': member.full_name,
                'stage_code': member.stage_code,
                'team': str(member.team_id) if member.team_id else None,
            },
        )


class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return MemberCreateUpdateSerializer
        return MemberDetailSerializer

    def get_queryset(self):
        _check_perm(self.request.user, 'members', 'view')
        qs = Member.objects.filter(deleted_at__isnull=True).prefetch_related(
            'code_history', 'transfer_logs', 'custom_values__custom_field'
        )
        return _scope_members_qs(qs, self.request.user)

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'members', 'edit')
        old_instance = self.get_object()
        old_data = {
            'full_name': old_instance.full_name,
            'stage_code': old_instance.stage_code,
            'stage': str(old_instance.stage_id) if old_instance.stage_id else None,
            'team': str(old_instance.team_id) if old_instance.team_id else None,
        }
        member = serializer.save()
        AuditLog.objects.create(
            action='UPDATE',
            user=self.request.user,
            entity_type='Member',
            entity_id=str(member.pk),
            description=str(member),
            ip_address=_get_client_ip(self.request) or None,
            old_values=old_data,
            new_values={
                'full_name': member.full_name,
                'stage_code': member.stage_code,
                'stage': str(member.stage_id) if member.stage_id else None,
                'team': str(member.team_id) if member.team_id else None,
            },
        )

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'members', 'delete')
        old_repr = str(instance)
        instance.delete()
        AuditLog.objects.create(
            action='DELETE',
            user=self.request.user,
            entity_type='Member',
            entity_id=str(instance.pk),
            description=old_repr,
            ip_address=_get_client_ip(self.request) or None,
        )


class MemberTransferView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        _check_perm(request.user, 'members', 'edit')
        qs = _scope_members_qs(
            Member.objects.filter(deleted_at__isnull=True), request.user
        )
        try:
            member = qs.get(pk=pk)
        except Member.DoesNotExist:
            return Response({'detail': 'الفرد غير موجود أو خارج نطاق صلاحياتك.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MemberTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.structure.models import Patrol, Stage, Team

        try:
            new_team = Team.objects.get(pk=data['to_team'])
        except Team.DoesNotExist:
            return Response({'detail': 'الفريق الجديد غير موجود.'}, status=status.HTTP_400_BAD_REQUEST)

        new_stage = None
        if data.get('to_stage'):
            try:
                new_stage = Stage.objects.get(pk=data['to_stage'])
            except Stage.DoesNotExist:
                return Response({'detail': 'المرحلة الجديدة غير موجودة.'}, status=status.HTTP_400_BAD_REQUEST)

        new_patrol = None
        if data.get('to_patrol'):
            try:
                new_patrol = Patrol.objects.get(pk=data['to_patrol'])
            except Patrol.DoesNotExist:
                pass

        old_team, old_stage, old_code = member.team, member.stage, member.stage_code

        if new_stage and new_stage != old_stage and old_code:
            MemberCodeHistory.objects.create(
                member=member, old_code=old_code, stage=old_stage,
                reason=data.get('reason', 'نقل الفرد'),
            )
            member.stage = new_stage
            member.stage_code = None

        member.team = new_team
        if new_patrol:
            member.patrol = new_patrol
        member.save()

        MemberTransferLog.objects.create(
            member=member, from_team=old_team, to_team=new_team,
            from_stage=old_stage, to_stage=new_stage or old_stage,
            reason=data.get('reason', ''), transferred_by=request.user,
        )
        AuditLog.objects.create(
            action='UPDATE', user=request.user, entity_type='Member',
            entity_id=str(member.pk), description=f'نقل {member}',
            ip_address=_get_client_ip(request) or None,
            new_values={'action': 'transfer', 'to_team': str(new_team)},
        )
        return Response(MemberDetailSerializer(member).data)


class MemberExportExcelView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _check_perm(request.user, 'members', 'export')
        qs = _scope_members_qs(
            Member.objects.filter(deleted_at__isnull=True, is_active=True)
            .select_related('group', 'stage', 'team', 'patrol'),
            request.user,
        )
        excel_bytes = export_members_excel(list(qs))
        AuditLog.objects.create(
            action='EXPORT', user=request.user, entity_type='Member',
            entity_id='', description='Excel export - members',
            ip_address=_get_client_ip(request) or None,
        )
        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="members_export.xlsx"'
        return response


class MemberImportTemplateView(views.APIView):
    """Download the import template Excel file."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        excel_bytes = generate_import_template()
        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="import_template.xlsx"'
        return response


class MemberImportPreviewView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        _check_perm(request.user, 'members', 'add')
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'لم يتم رفع ملف.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate magic bytes
        from apps.common.services.file_validator import validate_file_magic
        mime = validate_file_magic(file_obj)
        file_obj.seek(0)
        allowed_mimes = {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv', 'text/plain',
        }
        if mime not in allowed_mimes:
            return Response(
                {'detail': f'نوع الملف غير مسموح ({mime}). يُقبل xlsx أو csv فقط.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        custom_mapping = request.data.get('mapping')
        try:
            rows = parse_members_excel(file_obj, custom_mapping=custom_mapping)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'خطأ في قراءة الملف: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        summary = {
            'total': len(rows),
            'create': sum(1 for r in rows if r['action'] == 'CREATE'),
            'update': sum(1 for r in rows if r['action'] == 'UPDATE'),
            'conflict': sum(1 for r in rows if r['action'] == 'CONFLICT'),
            'error': sum(1 for r in rows if r['action'] == 'ERROR'),
        }
        return Response({'rows': rows, 'summary': summary})


class MemberImportConfirmView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        _check_perm(request.user, 'members', 'add')
        rows = request.data.get('rows', [])
        skip_errors = request.data.get('skip_errors', True)
        if not rows:
            return Response({'detail': 'لا توجد صفوف للاستيراد.'}, status=status.HTTP_400_BAD_REQUEST)

        created, updated, skipped, errors = 0, 0, 0, []

        from django.db import transaction
        with transaction.atomic():
            for row in rows:
                action = row.get('action')
                data = dict(row.get('data', {}))

                if action == 'ERROR':
                    if not skip_errors:
                        raise Exception(f'صف {row.get("row_number")}: {row.get("errors")}')
                    skipped += 1
                    errors.append(row)
                    continue

                # Ensure structural IDs are mapped to _id fields for Django create/update
                member_data = {}
                for k, v in data.items():
                    if k in ('group', 'stage', 'team', 'patrol'):
                        member_data[f'{k}_id'] = v
                    elif k != 'stage_code':
                        member_data[k] = v

                if action in ('CREATE', 'CONFLICT'):
                    try:
                        Member.objects.create(**member_data)
                        created += 1
                    except Exception as e:
                        if not skip_errors:
                            raise
                        errors.append({'row_number': row.get('row_number'), 'full_name': row.get('full_name'), 'action': 'ERROR', 'errors': [str(e)]})
                        skipped += 1

                elif action == 'UPDATE':
                    try:
                        stage_code = data.get('stage_code')
                        if stage_code:
                            Member.objects.filter(stage_code=stage_code).update(**member_data)
                            updated += 1
                        else:
                            skipped += 1
                    except Exception as e:
                        if not skip_errors:
                            raise
                        errors.append({'row_number': row.get('row_number'), 'full_name': row.get('full_name'), 'action': 'ERROR', 'errors': [str(e)]})
                        skipped += 1

        AuditLog.objects.create(
            action='IMPORT', user=request.user, entity_type='Member',
            entity_id='', description=f'Excel import: {created} added, {updated} updated, {skipped} skipped',
            ip_address=_get_client_ip(request) or None,
            new_values={'created': created, 'updated': updated, 'skipped': skipped, 'errors': len(errors)},
        )
        return Response({
            'created': created, 'updated': updated,
            'skipped': skipped, 'errors': errors, 'total_errors': len(errors),
        })


class MemberImportErrorsDownloadView(views.APIView):
    """Generate and return Excel file with error rows."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        error_rows = request.data.get('rows', [])
        if not error_rows:
            return Response({'detail': 'لا توجد أخطاء.'}, status=status.HTTP_400_BAD_REQUEST)
        excel_bytes = generate_errors_excel(error_rows)
        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        return response


class CustomFieldListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomFieldSerializer
    filterset_fields = ['group', 'field_type']

    def get_queryset(self):
        return CustomField.objects.all().order_by('name')


class CustomFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = CustomField.objects.all()
    serializer_class = CustomFieldSerializer
