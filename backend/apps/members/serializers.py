import re

from django.conf import settings
from rest_framework import serializers

from apps.common.services.crypto import encrypt_text
from apps.common.services.file_validator import validate_file_magic
from apps.members.models import (
    CustomField,
    CustomFieldValue,
    Member,
    MemberCodeHistory,
    MemberTransferLog,
)

# ─── helpers ───────────────────────────────────────────────────────────────

EGYPTIAN_PHONE_RE = re.compile(r'^01[0-2,5]\d{8}$')
NATIONAL_ID_RE = re.compile(r'^\d{14}$')


def _validate_egyptian_phone(value: str, field_label: str) -> str:
    if not value:
        return value
    digits = re.sub(r'\D', '', value)
    if not EGYPTIAN_PHONE_RE.match(digits):
        raise serializers.ValidationError(
            f'{field_label} غير صحيح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً.'
        )
    return digits


def _check_perm(user, module: str, action: str):
    """Raise PermissionDenied if user lacks the given permission."""
    from rest_framework.exceptions import PermissionDenied
    if user.role == 'ADMIN':
        return
    try:
        perms = user.permission.permissions
        if not perms.get(module, {}).get(action, False):
            raise PermissionDenied(f'ليس لديك صلاحية {action} في {module}.')
    except AttributeError:
        raise PermissionDenied('لم يتم تعيين صلاحيات لهذا الحساب.')


# ─── Read serializers ───────────────────────────────────────────────────────

class MemberCodeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberCodeHistory
        fields = ['id', 'old_code', 'stage', 'changed_at', 'reason']
        read_only_fields = fields


class MemberTransferLogSerializer(serializers.ModelSerializer):
    from_team_name = serializers.CharField(source='from_team.name', read_only=True)
    to_team_name = serializers.CharField(source='to_team.name', read_only=True)
    from_stage_name = serializers.CharField(source='from_stage.name', read_only=True)
    to_stage_name = serializers.CharField(source='to_stage.name', read_only=True)
    transferred_by_name = serializers.CharField(source='transferred_by.full_name', read_only=True)

    class Meta:
        model = MemberTransferLog
        fields = [
            'id', 'from_team', 'from_team_name', 'to_team', 'to_team_name',
            'from_stage', 'from_stage_name', 'to_stage', 'to_stage_name',
            'transferred_at', 'reason', 'transferred_by', 'transferred_by_name',
        ]
        read_only_fields = fields


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = ['id', 'name', 'field_type', 'group', 'required', 'options', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CustomFieldValueSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='custom_field.name', read_only=True)
    field_type = serializers.CharField(source='custom_field.field_type', read_only=True)

    class Meta:
        model = CustomFieldValue
        fields = ['id', 'custom_field', 'field_name', 'field_type', 'value']


class MemberListSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    patrol_name = serializers.CharField(source='patrol.name', read_only=True)

    class Meta:
        model = Member
        fields = [
            'id', 'full_name', 'gender', 'stage_code', 'phone',
            'group', 'group_name', 'stage', 'stage_name',
            'team', 'team_name', 'patrol', 'patrol_name',
            'is_active', 'photo',
        ]
        read_only_fields = ['id', 'stage_code', 'group_name', 'stage_name', 'team_name', 'patrol_name']


class MemberDetailSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    patrol_name = serializers.CharField(source='patrol.name', read_only=True)
    scout_year_name = serializers.CharField(source='scout_year.name', read_only=True)
    code_history = MemberCodeHistorySerializer(many=True, read_only=True)
    transfer_logs = MemberTransferLogSerializer(many=True, read_only=True)
    custom_values = CustomFieldValueSerializer(many=True, read_only=True)

    class Meta:
        model = Member
        fields = [
            'id', 'full_name', 'date_of_birth', 'gender', 'phone', 'guardian_phone',
            'address', 'photo', 'qr_image', 'stage_code',
            'group', 'group_name', 'stage', 'stage_name',
            'team', 'team_name', 'patrol', 'patrol_name',
            'scout_year', 'scout_year_name', 'is_active',
            'code_history', 'transfer_logs', 'custom_values',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'qr_image', 'stage_code',
            'group_name', 'stage_name', 'team_name', 'patrol_name', 'scout_year_name',
            'code_history', 'transfer_logs', 'custom_values',
            'created_at', 'updated_at',
        ]


# ─── Write serializer (full validation) ────────────────────────────────────

class MemberCreateUpdateSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False, allow_null=True)
    national_id = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        write_only=True, label='الرقم القومي'
    )
    custom_values = CustomFieldValueSerializer(many=True, required=False)

    class Meta:
        model = Member
        fields = [
            'full_name', 'date_of_birth', 'gender', 'phone', 'guardian_phone',
            'address', 'photo', 'national_id',
            'group', 'stage', 'team', 'patrol', 'scout_year',
            'custom_values',
        ]

    def validate_full_name(self, value):
        value = ' '.join(value.split())  # normalise whitespace
        if len(value) < 3:
            raise serializers.ValidationError('الاسم يجب أن يكون 3 أحرف على الأقل.')
        return value

    def validate_phone(self, value):
        return _validate_egyptian_phone(value, 'رقم الهاتف')

    def validate_guardian_phone(self, value):
        return _validate_egyptian_phone(value, 'هاتف ولي الأمر')

    def validate_national_id(self, value):
        if not value:
            return value
        digits = re.sub(r'\D', '', value)
        if not NATIONAL_ID_RE.match(digits):
            raise serializers.ValidationError('الرقم القومي يجب أن يتكون من 14 رقماً بالضبط.')
        return digits

    def validate_photo(self, value):
        if value:
            max_mb = getattr(settings, 'MAX_IMAGE_SIZE_MB', 10)
            if value.size > max_mb * 1024 * 1024:
                raise serializers.ValidationError(
                    f'حجم الصورة ({round(value.size / 1024 / 1024, 1)} ميجابايت) يتجاوز الحد المسموح ({max_mb} ميجابايت).'
                )
            allowed_mimes = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
            mime = validate_file_magic(value)
            if mime not in allowed_mimes:
                raise serializers.ValidationError(
                    f'نوع الملف الفعلي ({mime}) غير مسموح. يُقبل JPG / PNG / GIF / WEBP فقط.'
                )
            value.seek(0)
        return value

    def validate(self, attrs):
        # Cross-field: team must belong to stage, patrol must belong to team
        stage = attrs.get('stage')
        team = attrs.get('team')
        patrol = attrs.get('patrol')

        if team and stage and team.stage_id != stage.pk:
            raise serializers.ValidationError({'team': 'الفريق لا ينتمي إلى المرحلة المختارة.'})

        if patrol and team and patrol.team_id != team.pk:
            raise serializers.ValidationError({'patrol': 'الطابور لا ينتمي إلى الفريق المختار.'})

        return attrs

    def _save_custom_values(self, member, custom_values_data):
        for cv in custom_values_data:
            CustomFieldValue.objects.update_or_create(
                member=member,
                custom_field=cv['custom_field'],
                defaults={'value': cv.get('value', '')},
            )

    def to_representation(self, instance):
        """Return id + stage_code after create/update."""
        return MemberListSerializer(instance).data

    def create(self, validated_data):
        national_id = validated_data.pop('national_id', None)
        custom_values_data = validated_data.pop('custom_values', [])

        member = Member(**validated_data)
        if national_id:
            member.national_id_encrypted = encrypt_text(national_id)
        member.save()

        self._save_custom_values(member, custom_values_data)
        return member

    def update(self, instance, validated_data):
        national_id = validated_data.pop('national_id', None)
        custom_values_data = validated_data.pop('custom_values', [])

        # Archive stage_code if stage changed
        new_stage = validated_data.get('stage')
        if new_stage and new_stage != instance.stage and instance.stage_code:
            MemberCodeHistory.objects.create(
                member=instance,
                old_code=instance.stage_code,
                stage=instance.stage,
                reason='تغيير المرحلة عبر تعديل بيانات الفرد',
            )
            instance.stage_code = None  # regenerate on save

        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        if national_id:
            instance.national_id_encrypted = encrypt_text(national_id)

        instance.save()
        self._save_custom_values(instance, custom_values_data)
        return instance


# ─── Transfer & Import serializers ─────────────────────────────────────────

class MemberTransferSerializer(serializers.Serializer):
    to_team = serializers.UUIDField(label='الفريق الجديد')
    to_stage = serializers.UUIDField(required=False, allow_null=True, label='المرحلة الجديدة')
    to_patrol = serializers.UUIDField(required=False, allow_null=True, label='الطابور الجديد')
    reason = serializers.CharField(required=False, allow_blank=True, label='سبب النقل')


class ExcelImportRowSerializer(serializers.Serializer):
    row_number = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    stage_code = serializers.CharField(read_only=True, allow_null=True)
    action = serializers.ChoiceField(choices=['CREATE', 'UPDATE', 'DUPLICATE', 'ERROR'], read_only=True)
    errors = serializers.ListField(child=serializers.CharField(), read_only=True)
    data = serializers.DictField(read_only=True)
