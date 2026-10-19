from rest_framework import serializers
from .models import ReportTemplate, ReportLog

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = '__all__'

class ReportLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = ReportLog
        fields = ['id', 'template', 'template_name', 'user', 'user_name', 'parameters', 'generated_file_path', 'created_at']
        read_only_fields = ['user']
