from rest_framework import serializers
from .models import (
    CaseFile, AuditLayer, CurrentBuild,
    IntakeLayer, BuildLayer, DeltaLayer,
    Roadblock, ReasoningLayer, OutcomeLayer,
    ProjectUpdate,
)


class NestedLayerMixin:
    """
    Handles create/update for layer serializers that own a single ordered
    child relation (e.g. AuditLayer → builds, DeltaLayer → roadblocks).

    Subclasses must set:
        child_field  – name of the nested field (str), e.g. "builds"
        child_model  – the child model class, e.g. CurrentBuild
        child_fk     – the FK kwarg name on the child model, e.g. "audit"
    """
    child_field: str = None
    child_model = None
    child_fk: str = None

    def create(self, validated_data):
        children_data = validated_data.pop(self.child_field, [])
        instance = super().create(validated_data)
        for i, child in enumerate(children_data):
            self.child_model.objects.create(**{self.child_fk: instance}, order=i, **child)
        return instance

    def update(self, instance, validated_data):
        children_data = validated_data.pop(self.child_field, None)
        instance = super().update(instance, validated_data)
        if children_data is not None:
            getattr(instance, self.child_field).all().delete()
            for i, child in enumerate(children_data):
                self.child_model.objects.create(**{self.child_fk: instance}, order=i, **child)
        return instance


class CurrentBuildSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrentBuild
        exclude = ["audit", "order"]


class AuditLayerSerializer(NestedLayerMixin, serializers.ModelSerializer):
    child_field = "builds"
    child_model = CurrentBuild
    child_fk = "audit"

    builds = CurrentBuildSerializer(many=True, required=False)

    class Meta:
        model = AuditLayer
        exclude = ["case_file"]


class IntakeLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntakeLayer
        exclude = ["case_file"]


class BuildLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildLayer
        exclude = ["case_file"]


class RoadblockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roadblock
        exclude = ["delta", "order"]


class DeltaLayerSerializer(NestedLayerMixin, serializers.ModelSerializer):
    child_field = "roadblocks"
    child_model = Roadblock
    child_fk = "delta"

    roadblocks = RoadblockSerializer(many=True, required=False)

    class Meta:
        model = DeltaLayer
        exclude = ["case_file"]


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectUpdate
        exclude = ["case_file"]


class ReasoningLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReasoningLayer
        exclude = ["case_file"]


class OutcomeLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutcomeLayer
        exclude = ["case_file"]


# ── Full CaseFile (read) ──────────────────────────────────────────────────────

class CaseFileDetailSerializer(serializers.ModelSerializer):
    audit = AuditLayerSerializer(read_only=True)
    intake = IntakeLayerSerializer(read_only=True)
    build = BuildLayerSerializer(read_only=True)
    delta = DeltaLayerSerializer(read_only=True)
    reasoning = ReasoningLayerSerializer(read_only=True)
    outcome = OutcomeLayerSerializer(read_only=True)
    project_updates = ProjectUpdateSerializer(many=True, read_only=True)
    logged_by_id = serializers.UUIDField(read_only=True)
    logged_by_name = serializers.SerializerMethodField()
    logged_by_email = serializers.SerializerMethodField()

    class Meta:
        model = CaseFile
        fields = "__all__"

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.full_name
        return obj.logged_by_name or "Unknown"

    def get_logged_by_email(self, obj):
        return obj.logged_by.email if obj.logged_by else None


class PublicCaseFileSerializer(CaseFileDetailSerializer):
    """Read-only serializer for unauthenticated client share links."""

    class Meta(CaseFileDetailSerializer.Meta):
        fields = [
            "id", "name", "logged_by_name",
            "industries", "tools", "process_frameworks", "workflow_type", "team_size",
            "satisfaction_score", "roadblock_count", "built_outcome",
            "status", "closed_at",
            "created_at", "updated_at",
            "audit", "intake", "build", "delta", "reasoning", "outcome",
            "project_updates",
        ]


class CaseFileListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    logged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseFile
        fields = [
            "id", "name", "logged_by_id", "logged_by_name", "industries", "workflow_type",
            "team_size", "tools", "process_frameworks",
            "satisfaction_score", "roadblock_count", "built_outcome",
            "status", "closed_at",
            "created_at", "updated_at",
        ]

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.full_name
        return obj.logged_by_name or "Unknown"


# ── CaseFile write (create/update) ────────────────────────────────────────────

class CaseFileWriteSerializer(serializers.ModelSerializer):
    audit = AuditLayerSerializer(required=False)
    intake = IntakeLayerSerializer(required=False)
    build = BuildLayerSerializer(required=False)
    delta = DeltaLayerSerializer(required=False)
    reasoning = ReasoningLayerSerializer(required=False)
    outcome = OutcomeLayerSerializer(required=False)
    project_updates = ProjectUpdateSerializer(many=True, required=False)

    class Meta:
        model = CaseFile
        fields = [
            "name", "logged_by_name", "status",
            "audit", "intake", "build", "delta", "reasoning", "outcome",
            "project_updates",
        ]

    def create(self, validated_data):
        audit_data = validated_data.pop("audit", None)
        intake_data = validated_data.pop("intake", None)
        build_data = validated_data.pop("build", None)
        delta_data = validated_data.pop("delta", None)
        reasoning_data = validated_data.pop("reasoning", None)
        outcome_data = validated_data.pop("outcome", None)
        project_updates_data = validated_data.pop("project_updates", [])

        # Attach the authenticated user
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["logged_by"] = request.user

        case_file = CaseFile.objects.create(**validated_data)

        # Create each layer
        layer_map = [
            (audit_data, AuditLayerSerializer),
            (intake_data, IntakeLayerSerializer),
            (build_data, BuildLayerSerializer),
            (delta_data, DeltaLayerSerializer),
            (reasoning_data, ReasoningLayerSerializer),
            (outcome_data, OutcomeLayerSerializer),
        ]
        for data, SerializerClass in layer_map:
            if data is not None:
                s = SerializerClass(data=data)
                s.is_valid(raise_exception=True)
                s.save(case_file=case_file)

        # Create project updates
        for i, pu in enumerate(project_updates_data):
            pu.pop("order", None)
            ProjectUpdate.objects.create(case_file=case_file, order=i, **pu)

        # Denormalise key fields onto the CaseFile for fast filtering
        self._denormalise(case_file)
        return case_file

    def update(self, instance, validated_data):
        audit_data          = validated_data.pop("audit", None)
        intake_data         = validated_data.pop("intake", None)
        build_data          = validated_data.pop("build", None)
        delta_data          = validated_data.pop("delta", None)
        reasoning_data      = validated_data.pop("reasoning", None)
        outcome_data        = validated_data.pop("outcome", None)
        project_updates_data = validated_data.pop("project_updates", None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        layer_map = [
            (audit_data,     AuditLayerSerializer,     "audit"),
            (intake_data,    IntakeLayerSerializer,    "intake"),
            (build_data,     BuildLayerSerializer,     "build"),
            (delta_data,     DeltaLayerSerializer,     "delta"),
            (reasoning_data, ReasoningLayerSerializer, "reasoning"),
            (outcome_data,   OutcomeLayerSerializer,   "outcome"),
        ]
        for data, SerializerClass, related_name in layer_map:
            if data is None:
                continue
            layer = getattr(instance, related_name, None)
            if layer is not None:
                s = SerializerClass(layer, data=data, partial=True)
                s.is_valid(raise_exception=True)
                s.save()
            else:
                s = SerializerClass(data=data)
                s.is_valid(raise_exception=True)
                s.save(case_file=instance)

        if project_updates_data is not None:
            instance.project_updates.all().delete()
            for i, pu in enumerate(project_updates_data):
                pu.pop("order", None)
                ProjectUpdate.objects.create(case_file=instance, order=i, **pu)

        self._denormalise(instance)
        return instance

    def _denormalise(self, case_file):
        """Copy frequently-filtered fields up to CaseFile."""
        updates = {}
        if hasattr(case_file, "intake"):
            i = case_file.intake
            updates["industries"] = i.industries
            updates["tools"] = i.tools
            updates["process_frameworks"] = i.process_frameworks
            updates["workflow_type"] = i.workflow_type
            updates["team_size"] = i.team_size
        if hasattr(case_file, "delta"):
            updates["roadblock_count"] = case_file.delta.roadblocks.count()
        if hasattr(case_file, "outcome"):
            updates["satisfaction_score"] = case_file.outcome.satisfaction
            updates["built_outcome"] = case_file.outcome.built
        if updates:
            CaseFile.objects.filter(pk=case_file.pk).update(**updates)
