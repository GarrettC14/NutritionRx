package com.nutritionrx.wear.complications

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.MonochromaticImage
import androidx.wear.watchface.complications.data.MonochromaticImageComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.nutritionrx.wear.MainActivity
import com.nutritionrx.wear.R
import com.nutritionrx.wear.data.NutritionRepository

/**
 * Water Complication
 * Shows current water count on watch faces
 */
class WaterComplicationService : ComplicationDataSourceService() {

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
                water = summary.water,
                goal = summary.waterGoal,
                tapIntent = tapIntent
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                water = summary.water,
                goal = summary.waterGoal,
                tapIntent = tapIntent
            )
            ComplicationType.ICON -> createIconComplication(tapIntent = tapIntent)
            else -> null
        }

        listener.onComplicationData(complicationData)
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> createShortTextComplication(
                water = 5,
                goal = 8,
                tapIntent = null
            )
            ComplicationType.RANGED_VALUE -> createRangedValueComplication(
                water = 5,
                goal = 8,
                tapIntent = null
            )
            ComplicationType.ICON -> createIconComplication(tapIntent = null)
            else -> null
        }
    }

    private fun createShortTextComplication(
        water: Int,
        goal: Int,
        tapIntent: PendingIntent?
    ): ShortTextComplicationData {
        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder("$water/$goal").build(),
            contentDescription = PlainComplicationText.Builder("$water of $goal glasses of water").build()
        )
            .setTitle(PlainComplicationText.Builder("\uD83D\uDCA7").build()) // Water droplet emoji
            .setTapAction(tapIntent)
            .build()
    }

    private fun createRangedValueComplication(
        water: Int,
        goal: Int,
        tapIntent: PendingIntent?
    ): RangedValueComplicationData {
        return RangedValueComplicationData.Builder(
            value = water.toFloat(),
            min = 0f,
            max = goal.toFloat(),
            contentDescription = PlainComplicationText.Builder("$water of $goal glasses").build()
        )
            .setText(PlainComplicationText.Builder("$water").build())
            .setTitle(PlainComplicationText.Builder("\uD83D\uDCA7").build())
            .setTapAction(tapIntent)
            .build()
    }

    private fun createIconComplication(
        tapIntent: PendingIntent?
    ): MonochromaticImageComplicationData {
        return MonochromaticImageComplicationData.Builder(
            monochromaticImage = MonochromaticImage.Builder(
                android.graphics.drawable.Icon.createWithResource(
                    this,
                    R.drawable.ic_complication_water
                )
            ).build(),
            contentDescription = PlainComplicationText.Builder("Water tracking").build()
        )
            .setTapAction(tapIntent)
            .build()
    }

    private fun createTapIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("screen", "water")
        }
        return PendingIntent.getActivity(
            this,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
