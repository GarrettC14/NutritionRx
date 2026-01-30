package com.nutritionrx.wear.complications

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.nutritionrx.wear.MainActivity
import com.nutritionrx.wear.data.FastingState
import com.nutritionrx.wear.data.NutritionRepository

/**
 * Fasting Complication
 * Shows fasting status and time remaining on watch faces
 */
class FastingComplicationService : ComplicationDataSourceService() {

    private lateinit var repository: NutritionRepository

    override fun onCreate() {
        super.onCreate()
        repository = NutritionRepository.getInstance(applicationContext)
    }

    override fun onComplicationRequest(
        request: ComplicationRequest,
        listener: ComplicationRequestListener
    ) {
        val fastingState = repository.fastingState.value
        val tapIntent = createTapIntent()

        val complicationData = when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> createShortTextComplication(
                state = fastingState,
                tapIntent = tapIntent
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                state = fastingState,
                tapIntent = tapIntent
            )
            else -> null
        }

        listener.onComplicationData(complicationData)
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        val previewState = FastingState(
            isEnabled = true,
            isFasting = true,
            fastStartTime = System.currentTimeMillis() - (14 * 60 * 60 * 1000L), // 14h ago
            eatingWindowStart = "12:00",
            eatingWindowEnd = "20:00"
        )
        return when (type) {
            ComplicationType.SHORT_TEXT -> createShortTextComplication(
                state = previewState,
                tapIntent = null
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                state = previewState,
                tapIntent = null
            )
            else -> null
        }
    }

    private fun createShortTextComplication(
        state: FastingState?,
        tapIntent: PendingIntent?
    ): ShortTextComplicationData {
        if (state == null || !state.isEnabled) {
            return ShortTextComplicationData.Builder(
                text = PlainComplicationText.Builder("--:--").build(),
                contentDescription = PlainComplicationText.Builder("Fasting not configured").build()
            )
                .setTitle(PlainComplicationText.Builder("\u23F1\uFE0F").build())
                .setTapAction(tapIntent)
                .build()
        }

        val (timeText, title) = if (state.isFasting) {
            val remaining = calculateRemainingTime(state)
            formatDuration(remaining) to "\uD83C\uDF19"
        } else {
            "Open" to "\uD83C\uDF7D\uFE0F"
        }

        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder(timeText).build(),
            contentDescription = PlainComplicationText.Builder(
                if (state.isFasting) "Fasting: $timeText remaining" else "Eating window open"
            ).build()
        )
            .setTitle(PlainComplicationText.Builder(title).build())
            .setTapAction(tapIntent)
            .build()
    }

    private fun createRangedValueComplication(
        state: FastingState?,
        tapIntent: PendingIntent?
    ): RangedValueComplicationData {
        if (state == null || !state.isEnabled) {
            return RangedValueComplicationData.Builder(
                value = 0f,
                min = 0f,
                max = 100f,
                contentDescription = PlainComplicationText.Builder("Fasting not configured").build()
            )
                .setText(PlainComplicationText.Builder("--:--").build())
                .setTitle(PlainComplicationText.Builder("\u23F1\uFE0F").build())
                .setTapAction(tapIntent)
                .build()
        }

        val (timeText, progress) = if (state.isFasting) {
            val remaining = calculateRemainingTime(state)
            val totalMs = (state.protocol?.fastingHours ?: 16) * 60 * 60 * 1000L
            val elapsed = totalMs - remaining
            val prog = (elapsed.toFloat() / totalMs).coerceIn(0f, 1f)
            formatDuration(remaining) to prog
        } else {
            "Open" to 0.5f
        }

        return RangedValueComplicationData.Builder(
            value = progress * 100,
            min = 0f,
            max = 100f,
            contentDescription = PlainComplicationText.Builder(
                if (state.isFasting) "Fasting progress" else "Eating window"
            ).build()
        )
            .setText(PlainComplicationText.Builder(timeText).build())
            .setTitle(
                PlainComplicationText.Builder(
                    if (state.isFasting) "\uD83C\uDF19" else "\uD83C\uDF7D\uFE0F"
                ).build()
            )
            .setTapAction(tapIntent)
            .build()
    }

    private fun calculateRemainingTime(state: FastingState): Long {
        val fastStartTime = state.fastStartTime ?: return 0
        val totalFastMs = (state.protocol?.fastingHours ?: 16) * 60 * 60 * 1000L
        val elapsedMs = System.currentTimeMillis() - fastStartTime
        return (totalFastMs - elapsedMs).coerceAtLeast(0)
    }

    private fun formatDuration(millis: Long): String {
        if (millis <= 0) return "0:00"
        val hours = millis / (1000 * 60 * 60)
        val minutes = (millis % (1000 * 60 * 60)) / (1000 * 60)
        return "%d:%02d".format(hours, minutes)
    }

    private fun createTapIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("screen", "fasting")
        }
        return PendingIntent.getActivity(
            this,
            2,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
