package com.nutritionrx.wear.tiles

import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.Box
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.LayoutElementBuilders.Row
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
import com.nutritionrx.wear.data.FastingState
import com.nutritionrx.wear.data.NutritionRepository
import com.nutritionrx.wear.theme.OnSurfaceVariant
import com.nutritionrx.wear.theme.Sage
import com.nutritionrx.wear.theme.Terracotta

/**
 * Fasting Timer Tile
 * Shows current fasting or eating window state with countdown
 */
class FastingTileService : TileService() {

    private lateinit var repository: NutritionRepository

    override fun onCreate() {
        super.onCreate()
        repository = NutritionRepository.getInstance(applicationContext)
    }

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<Tile> {
        val fastingState = repository.fastingState.value

        val timeline = Timeline.Builder()
            .addTimelineEntry(
                TimelineEntry.Builder()
                    .setLayout(
                        LayoutElementBuilders.Layout.Builder()
                            .setRoot(createTileLayout(fastingState))
                            .build()
                    )
                    .build()
            )
            .build()

        return Futures.immediateFuture(
            Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setTileTimeline(timeline)
                .setFreshnessIntervalMillis(60_000) // 1 minute for timer accuracy
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

    private fun createTileLayout(state: FastingState?): LayoutElementBuilders.LayoutElement {
        if (state == null || !state.isEnabled) {
            return createNotConfiguredLayout()
        }
        return if (state.isFasting) {
            createFastingLayout(state)
        } else {
            createEatingLayout(state)
        }
    }

    private fun createFastingLayout(state: FastingState): LayoutElementBuilders.LayoutElement {
        val fastStartTime = state.fastStartTime ?: System.currentTimeMillis()
        val totalFastMs = (state.protocol?.fastingHours ?: 16) * 60 * 60 * 1000L
        val remainingMs = (totalFastMs - (System.currentTimeMillis() - fastStartTime)).coerceAtLeast(0)
        val timeText = formatDuration(remainingMs)

        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(
                Modifiers.Builder()
                    .setPadding(Padding.Builder().setAll(dp(8f)).build())
                    .setClickable(
                        Clickable.Builder()
                            .setOnClick(
                                ActionBuilders.LaunchAction.Builder()
                                    .setAndroidActivity(
                                        ActionBuilders.AndroidActivity.Builder()
                                            .setPackageName(packageName)
                                            .setClassName("$packageName.MainActivity")
                                            .addKeyToExtraMapping(
                                                "screen",
                                                ActionBuilders.AndroidStringExtra.Builder()
                                                    .setValue("fasting")
                                                    .build()
                                            )
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .addContent(
                Column.Builder()
                    .setWidth(expand())
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(
                        Text.Builder()
                            .setText("\uD83C\uDF19 FASTING")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(14f))
                                    .setColor(argb(Sage.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(
                        Text.Builder()
                            .setText(timeText)
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
                                    .setColor(argb(OnSurfaceVariant.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(
                        Text.Builder()
                            .setText("Window opens ${state.eatingWindowStart}")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(11f))
                                    .setColor(argb(OnSurfaceVariant.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun createEatingLayout(state: FastingState): LayoutElementBuilders.LayoutElement {
        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(
                Modifiers.Builder()
                    .setPadding(Padding.Builder().setAll(dp(8f)).build())
                    .setClickable(
                        Clickable.Builder()
                            .setOnClick(
                                ActionBuilders.LaunchAction.Builder()
                                    .setAndroidActivity(
                                        ActionBuilders.AndroidActivity.Builder()
                                            .setPackageName(packageName)
                                            .setClassName("$packageName.MainActivity")
                                            .addKeyToExtraMapping(
                                                "screen",
                                                ActionBuilders.AndroidStringExtra.Builder()
                                                    .setValue("fasting")
                                                    .build()
                                            )
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .addContent(
                Column.Builder()
                    .setWidth(expand())
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(
                        Text.Builder()
                            .setText("\uD83C\uDF7D\uFE0F EATING WINDOW")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(14f))
                                    .setColor(argb(Terracotta.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(
                        Text.Builder()
                            .setText("Open")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(32f))
                                    .setWeight(LayoutElementBuilders.FONT_WEIGHT_BOLD)
                                    .setColor(argb(0xFFFFFFFF.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(4f)).build())
                    .addContent(
                        Text.Builder()
                            .setText("Fast begins ${state.eatingWindowEnd}")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(11f))
                                    .setColor(argb(OnSurfaceVariant.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(4f)).build())
                    .addContent(
                        Text.Builder()
                            .setText(state.protocol?.name ?: "16:8")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(11f))
                                    .setColor(argb(OnSurfaceVariant.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun createNotConfiguredLayout(): LayoutElementBuilders.LayoutElement {
        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .addContent(
                Column.Builder()
                    .setWidth(expand())
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(
                        Text.Builder()
                            .setText("\u23F1\uFE0F")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(24f))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(
                        Text.Builder()
                            .setText("Fasting not configured")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(sp(12f))
                                    .setColor(argb(OnSurfaceVariant.value.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun formatDuration(millis: Long): String {
        if (millis <= 0) return "0:00"
        val hours = millis / (1000 * 60 * 60)
        val minutes = (millis % (1000 * 60 * 60)) / (1000 * 60)
        return "%d:%02d".format(hours, minutes)
    }

    companion object {
        private const val RESOURCES_VERSION = "1"
    }
}
