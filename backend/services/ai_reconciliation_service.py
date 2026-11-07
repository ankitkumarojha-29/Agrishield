"""
AI Auto-Reconciliation Service for AgriShield.
Handles automatic retrospective inference:
When scans are submitted while the AI microservice/tunnel is offline,
this background service detects when the AI service comes back online,
re-runs the authentic PyTorch EfficientNet-B0 inference on the original stored image,
and updates the database and farmer's scan history with the true diagnosis.
"""

import uuid
import logging
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm.attributes import flag_modified

from core.config import settings
from db.models import AIAssessment, AssessmentType, FileRecord, Notification, NotificationType
from services.ai_client import get_ai_client

logger = logging.getLogger("agrishield.ai_reconciliation")


async def is_ai_service_online() -> bool:
    """Lightweight 2.5-second health check against the configured AI Service URL."""
    ai_url = (settings.AI_SERVICE_URL or "").rstrip("/")
    if not ai_url:
        return False
    try:
        headers = {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "AgriShield-Reconciler/1.0"
        }
        async with httpx.AsyncClient(timeout=2.5, follow_redirects=True, headers=headers) as client:
            resp = await client.get(f"{ai_url}/health/")
            return resp.status_code == 200
    except Exception:
        return False


async def reconcile_pending_crop_scans(db: AsyncSession, batch_limit: int = 15) -> int:
    """
    Scans the database for any crop health assessments that were processed in fallback mode.
    If the AI microservice/tunnel is online, re-runs real EfficientNet-B0 inference on the original photo,
    updates diagnosis, severity, treatment, and marks is_fallback=False.
    """
    online = await is_ai_service_online()
    if not online:
        return 0

    try:
        stmt = (
            select(AIAssessment)
            .where(
                AIAssessment.type == AssessmentType.CROP_HEALTH,
                AIAssessment.model_version.like("%mock%")
            )
            .order_by(AIAssessment.created_at.asc())
            .limit(batch_limit)
        )
        res = await db.execute(stmt)
        pending_assessments = res.scalars().all()

        if not pending_assessments:
            return 0

        logger.info(f"[AI_RECONCILER] Found {len(pending_assessments)} fallback scans awaiting real AI re-analysis...")
        ai_client = get_ai_client()
        reconciled_count = 0

        for assessment in pending_assessments:
            payload = dict(assessment.payload or {})
            file_id_str = payload.get("file_id")

            if not file_id_str:
                # No raw binary file attached, cannot re-run inference
                continue

            try:
                file_uuid = uuid.UUID(file_id_str)
                file_rec = await db.get(FileRecord, file_uuid)
                if not file_rec or not file_rec.data:
                    continue

                crop = payload.get("crop", "wheat")
                growth_stage = payload.get("growth_stage", "vegetative")

                # Run authentic live inference on the original image bytes
                real_result = await ai_client.get_crop_health(file_rec.data, crop, growth_stage)

                if real_result.get("is_fallback") or "mock" in str(real_result.get("model_version", "")).lower():
                    # AI service still returned fallback (e.g. error parsing image), abort batch
                    break

                # Extract verified disease and prescriptions
                label = real_result.get("label", "Healthy")
                severity = real_result.get("severity", "none")
                confidence = float(real_result.get("confidence", 0.90))
                model_ver = real_result.get("model_version", "effnet-crop-v1")

                # Treatment & prevention
                if "healthy" in label.lower():
                    treatment = "फसल की पत्तियां पूरी तरह स्वस्थ और रोग-मुक्त हैं। संतुलित खाद और पानी बनाए रखें।"
                    prevention = "हर 5-7 दिन में खेत की सामान्य निगरानी करें।"
                else:
                    treatment = f"{label} रोग के लक्षण पाए गए हैं। नजदीकी कृषि विज्ञान केंद्र (KVK) अनुसार उचित कीटनाशक/फफूंदनाशक का छिड़काव करें।"
                    prevention = "खेत के चारों ओर खरपतवार साफ रखें और रोगी पत्तियों को नष्ट करें।"

                # Update assessment model and metrics
                assessment.model_version = model_ver
                assessment.confidence = confidence
                assessment.low_confidence = bool(real_result.get("low_confidence", False))

                # Update payload
                payload["diagnosis"] = label
                payload["disease"] = label
                payload["severity"] = severity
                payload["treatment"] = treatment
                payload["prevention"] = prevention
                payload["is_fallback"] = False
                payload["ai_engine"] = "live_tunnel"
                payload["reanalyzed_at"] = datetime.utcnow().isoformat()
                payload["reanalysis_completed"] = True

                assessment.payload = payload
                flag_modified(assessment, "payload")

                # Optional: Send informative notification to the farmer
                farmer_id_str = payload.get("user_id")
                if farmer_id_str:
                    try:
                        farmer_uuid = uuid.UUID(farmer_id_str)
                        notif = Notification(
                            user_id=farmer_uuid,
                            type=NotificationType.SYSTEM_ALERT,
                            message=f"🌱 सटीक AI पत्ती रोग विश्लेषण: आपके खेत ({payload.get('farm_name', 'खेत')}) की पत्ती जांच का सटीक विश्लेषण पूर्ण हुआ: {label} (विश्वसनीयता: {round(confidence * 100)}%)।"
                        )
                        db.add(notif)
                    except Exception:
                        pass

                reconciled_count += 1
                logger.info(f"[AI_RECONCILER] Successfully re-analyzed scan {assessment.id}: {label} ({confidence*100:.1f}%)")

            except Exception as item_err:
                logger.warning(f"[AI_RECONCILER] Failed to reconcile scan {assessment.id}: {item_err}")
                continue

        if reconciled_count > 0:
            await db.commit()
            logger.info(f"[AI_RECONCILER] Successfully committed {reconciled_count} reconciled scans to database.")

        return reconciled_count

    except Exception as e:
        logger.error(f"[AI_RECONCILER] Error during scan reconciliation iteration: {e}")
        await db.rollback()
        return 0
