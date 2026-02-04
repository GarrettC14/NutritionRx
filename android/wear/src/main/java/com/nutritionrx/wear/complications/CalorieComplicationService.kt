package com.nutritionrx.wear.complications

import android.app.PendingIntent
import android.content.Intent
import android.graphics.drawable.Icon
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.nutritionrx.wear.MainActivity
import com.nutritionrx.wear.R
import com.nutritionrx.wear.data.NutritionRepository

/**
 * Calorie Complication
 * Shows current calorie count on watch faces
 */
class CalorieComplicationService : ComplicationDataSourceService() {

    private lateinit var repository: NutritionRepository

    override fun onCreate() {
        super.onCreate()
        repository = NutritionRepository.getInstance(applicationContext)
    }

    override fun onComplicationRequest(
        request: ComplicationRequest,
        listener: ComplicationRequestListener
    ) {
        val summary = repository.dailySummary.value
        val tapIntent = createTapIntent()

        val complicationData = when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> createShortTextComplication(
                calories = summary.calories,
                tapIntent = tapIntent
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                calories = summary.calories,
                goal = summary.calorieGoal,
                tapIntent = tapIntent
            )
            else -> null
        }

        listener.onComplicationData(complicationData)
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> createShortTextComplication(
                calories = 1450,
                tapIntent = null
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                calories = 1450,
                goal = 2000,
                tapIntent = null
            )
            else -> null
        }
    }

    private fun createShortTextComplication(
        calories: Int,
        tapIntent: PendingIntent?
    ): ShortTextComplicationData {
        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder("$calories").build(),
            contentDescription = PlainComplicationText.Builder("$calories calories today").build()
        )
            .setTitle(PlainComplicationText.Builder("cal").build())
            .setTapAction(tapIntent)
            .build()
    }

    private fun createRangedValueComplication(
        calories: Int,
        goal: Int,
        tapIntent: PendingIntent?
    ): RangedValueComplicationData {
        return RangedValueComplicationData.Builder(
            value = calories.toFloat(),
            min = 0f,
            max = goal.toFloat(),
            contentDescription = PlainComplicationText.Builder("$calories of $goal calories").build()
        )
            .setText(PlainComplicationText.Builder("$calories").build())
            .setTitle(PlainComplicationText.Builder("cal").build())
            .setTapAction(tapIntent)
            .build()
    }

    private fun createTapIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        return PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
