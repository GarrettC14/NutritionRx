package com.nutritionrx.wear.tiles

import android.content.Context
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.Box
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.LayoutElementBuilders.Row
import androidx.wear.protolayout.LayoutElementBuilders.Spacer
import androidx.wear.protolayout.LayoutElementBuilders.Text
import androidx.wear.protolayout.ModifiersBuilders.Background
import androidx.wear.protolayout.ModifiersBuilders.Clickable
import androidx.wear.protolayout.ModifiersBuilders.Corner
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
import com.nutritionrx.wear.data.QuickAddPreset
import com.nutritionrx.wear.data.WearAction
import com.nutritionrx.wear.data.WearDataService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Quick Add Tile
 * Shows preset calorie buttons directly on the watch face
 */
class QuickAddTileService : TileService() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var repository: NutritionRepository
    private lateinit var dataService: WearDataService

    override fun onCreate() {
        super.onCreate()
        repository = NutritionRepository.getInstance(applicationContext)
        dataService = WearDataService.getInstance(applicationContext)
    }

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<Tile> {
        val summary = repository.dailySummary.value

        val timeline = Timeline.Builder()
            .addTimelineEntry(
                TimelineEntry.Builder()
                    .setLayout(
                        LayoutElementBuilders.Layout.Builder()
                            .setRoot(createTileLayout(summary.calories, summary.calorieGoal))
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

    private fun createTileLayout(calories: Int, goal: Int): LayoutElementBuilders.LayoutElement {
        return Box.Builder()
            .setWidth(expand())
            .setHeight(expand())
            .setModifiers(
                Modifiers.Builder()
                    .setPadding(
                        Padding.Builder()
                            .setAll(dp(8f))
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
                            .setText("$calories cal")
                            .setFontStyle(
                                LayoutElementBuilders.FontStyle.Builder()
                                    .setSize(dp(16f))
                                    .setColor(argb(0xFF58A663.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .addContent(Spacer.Builder().setHeight(dp(8f)).build())
                    .addContent(createQuickAddRow(listOf(100, 200, 300)))
                    .addContent(Spacer.Builder().setHeight(dp(4f)).build())
                    .addContent(createQuickAddRow(listOf(400, 500)))
                    .build()
            )
            .build()
    }

    private fun createQuickAddRow(calories: List<Int>): Row {
        val rowBuilder = Row.Builder()
            .setWidth(expand())

        calories.forEachIndexed { index, cal ->
            if (index > 0) {
                rowBuilder.addContent(Spacer.Builder().setWidth(dp(4f)).build())
            }
            rowBuilder.addContent(createQuickAddButton(cal))
        }

        return rowBuilder.build()
    }

    private fun createQuickAddButton(calories: Int): Box {
        return Box.Builder()
            .setWidth(dp(48f))
            .setHeight(dp(36f))
            .setModifiers(
                Modifiers.Builder()
                    .setBackground(
                        Background.Builder()
                            .setColor(argb(0xFF58A663.toInt()))
                            .setCorner(Corner.Builder().setRadius(dp(18f)).build())
                            .build()
                    )
                    .setClickable(
                        Clickable.Builder()
                            .setOnClick(
                                ActionBuilders.LaunchAction.Builder()
                                    .setAndroidActivity(
                                        ActionBuilders.AndroidActivity.Builder()
                                            .setPackageName(packageName)
                                            .setClassName("$packageName.TileActionReceiver")
                                            .addKeyToExtraMapping(
                                                "action",
                                                ActionBuilders.AndroidStringExtra.Builder()
                                                    .setValue("quickadd:$calories")
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
                Text.Builder()
                    .setText("+$calories")
                    .setFontStyle(
                        LayoutElementBuilders.FontStyle.Builder()
                            .setSize(dp(12f))
                            .setColor(argb(0xFFFFFFFF.toInt()))
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
