package com.nutritionrx.wear.tiles

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.Arc
import androidx.wear.protolayout.LayoutElementBuilders.ArcLine
import androidx.wear.protolayout.LayoutElementBuilders.Box
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.LayoutElementBuilders.Spacer
import androidx.wear.protolayout.LayoutElementBuilders.Text
import androidx.wear.protolayout.ModifiersBuilders.Clickable
import androidx.wear.protolayout.ModifiersBuilders.Modifiers
import androidx.wear.protolayout.ModifiersBuilders.Padding
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders.Timeline
import androidx.wear.protolayout.TimelineBuilders.TimelineEntry
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders.Tile
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.nutritionrx.wear.data.NutritionRepository

/**
 * Progress Tile
 * Shows daily calorie progress with a ring visualization
 */
class ProgressTileService : TileService() {

    private lateinit var repository: NutritionRepository

    override fun onCreate() {
        super.onCreate()
        repository = NutritionRepository.getInstance(applicationContext)
    }

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<Tile> {
        val summary = repository.dailySummary.value

        val timeline = Timeline.Builder()
            .addTimelineEntry(
                TimelineEntry.Builder()
                    .setLayout(
                        LayoutElementBuilders.Layout.Builder()
                            .setRoot(
                                createTileLayout(
                                    calories = summary.calories,
                                    goal = summary.calorieGoal,
                                    water = summary.water,
                                    waterGoal = summary.waterGoal
                                )
                            )
                            .build()
                    )
                    .build()
            )
            .build()

        return Futures.immediateFuture(
            Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setTileTimeline(timeline)
                .setFreshnessIntervalMillis(300_000) // 5 minutes
                .build()
        )
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        return Futures.immediateFuture(
            ResourceBuilders.Resources.Builder()
                .setVersion(RESOURCES_VERSION)
                .build()
        )
    }

    private fun createTileLayout(
        calories: Int,
        goal: Int,
        water: Int,
        waterGoal: Int
    ): LayoutElementBuilders.LayoutElement {
        val progress = if (goal > 0) (calories.toFloat() / goal).coerceIn(0f, 1f) else 0f
        val remaining = (goal - calories).coerceAtLeast(0)

        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(
                Modifiers.Builder()
                    .setClickable(
                        Clickable.Builder()
                            .setOnClick(
                                ActionBuilders.LaunchAction.Builder()
                                    .setAndroidActivity(
                                        ActionBuilders.AndroidActivity.Builder()
                                            .setPackageName(packageName)
                                            .setClassName("$packageName.MainActivity")
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .addContent(
                // Progress arc (background)
                Arc.Builder()
                    .setAnchorAngle(
                        DimensionBuilders.DegreesProp.Builder(270f).build()
                    )
                    .setAnchorType(LayoutElementBuilders.ARC_ANCHOR_START)
                    .addContent(
                        ArcLine.Builder()
                            .setLength(
                                DimensionBuilders.DegreesProp.Builder(360f).build()
                            )
                            .setThickness(dp(8f))
                            .setColor(argb(0xFF333333.toInt()))
                            .build()
                    )
                    .build()
            )
            .addContent(
                // Progress arc (foreground)
                Arc.Builder()
                    .setAnchorAngle(
                        DimensionBuilders.DegreesProp.Builder(270f).build()
                    )
                    .setAnchorType(LayoutElementBuilders.ARC_ANCHOR_START)
                    .addContent(
                        ArcLine.Builder()
                            .setLength(
                                DimensionBuilders.DegreesProp.Builder(360f * progress).build()
                            )
                            .setThickness(dp(8f))
                            .setColor(argb(0xFF58A663.toInt()))
                            .build()
                    )
                    .build()
            )
            .addContent(
                // Center content
                Column.Builder()
                    .setWidth(expand())
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(
                        Text.Builder()
                            .setText(remaining.toString())
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(32f))
                                    .setWeight(LayoutElementBuilders.FONT_WEIGHT_BOLD)
                                    .setColor(argb(0xFFFFFFFF.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(
                        Text.Builder()
                            .setText("remaining")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(12f))
                                    .setColor(argb(0xFFB3B3B3.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(
                        Text.Builder()
                            .setText("\uD83D\uDCA7 $water/$waterGoal")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(14f))
                                    .setColor(argb(0xFF7DBDE8.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()
    }

    companion object {
        private const val RESOURCES_VERSION = "1"
    }
}
