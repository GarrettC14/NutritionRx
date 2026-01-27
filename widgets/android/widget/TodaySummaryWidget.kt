package com.nutritionrx.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Today Summary Widget
 * Displays daily calorie and macro tracking progress
 */
class TodaySummaryWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),  // Small
            DpSize(200.dp, 110.dp),  // Medium
            DpSize(300.dp, 200.dp),  // Large
        )
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataProvider.getInstance(context).getCurrentData()

        provideContent {
            WidgetContent(data)
        }
    }

    @Composable
    private fun WidgetContent(data: WidgetDataContainer) {
        val size = LocalSize.current

        GlanceTheme {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(GlanceTheme.colors.widgetBackground)
                    .cornerRadius(16.dp)
                    .clickable(actionStartActivity<LaunchActivity>()),
                contentAlignment = Alignment.Center
            ) {
                when {
                    size.width < 180.dp -> SmallContent(data.nutrition)
                    size.width < 280.dp -> MediumContent(data.nutrition)
                    else -> LargeContent(data.nutrition, data.water)
                }
            }
        }
    }

    @Composable
    private fun SmallContent(nutrition: NutritionData) {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Today",
                style = TextStyle(
                    fontSize = 12.sp,
                    color = ColorProvider(Color.Gray)
                )
            )

            Spacer(modifier = GlanceModifier.height(4.dp))

            Text(
                text = "${nutrition.caloriesConsumed}",
                style = TextStyle(
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = GlanceTheme.colors.onSurface
                )
            )

            Text(
                text = "of ${nutrition.caloriesGoal} cal",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = ColorProvider(Color.Gray)
                )
            )

            Spacer(modifier = GlanceModifier.height(8.dp))

            ProgressBar(nutrition.caloriesProgress)
        }
    }

    @Composable
    private fun MediumContent(nutrition: NutritionData) {
        Row(
            modifier = GlanceModifier.fillMaxSize().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Calories Section
            Column(
                modifier = GlanceModifier.defaultWeight(),
                horizontalAlignment = Alignment.Start
            ) {
                Text(
                    text = "Calories",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Text(
                    text = "${nutrition.caloriesConsumed}",
                    style = TextStyle(
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = GlanceTheme.colors.onSurface
                    )
                )

                Text(
                    text = "${nutrition.caloriesRemaining} remaining",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Spacer(modifier = GlanceModifier.height(4.dp))
                ProgressBar(nutrition.caloriesProgress)
            }

            Spacer(modifier = GlanceModifier.width(16.dp))

            // Macros Section
            Column(
                modifier = GlanceModifier.defaultWeight(),
                horizontalAlignment = Alignment.Start
            ) {
                Text(
                    text = "Macros",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Spacer(modifier = GlanceModifier.height(4.dp))

                MacroRow("P", nutrition.proteinConsumed.toInt(), nutrition.proteinGoal.toInt(), Color(0xFFEF4444))
                MacroRow("C", nutrition.carbsConsumed.toInt(), nutrition.carbsGoal.toInt(), Color(0xFF22C55E))
                MacroRow("F", nutrition.fatConsumed.toInt(), nutrition.fatGoal.toInt(), Color(0xFFEAB308))
            }
        }
    }

    @Composable
    private fun LargeContent(nutrition: NutritionData, water: WaterData) {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Calories Section
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.SpaceBetween
            ) {
                Text(
                    text = "Today's Calories",
                    style = TextStyle(
                        fontSize = 14.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )
                Text(
                    text = "${(nutrition.caloriesProgress * 100).toInt()}%",
                    style = TextStyle(
                        fontSize = 14.sp,
                        color = ColorProvider(Color(0xFF3B82F6))
                    )
                )
            }

            Row(
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = "${nutrition.caloriesConsumed}",
                    style = TextStyle(
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = GlanceTheme.colors.onSurface
                    )
                )
                Text(
                    text = " / ${nutrition.caloriesGoal}",
                    style = TextStyle(
                        fontSize = 16.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )
            }

            ProgressBar(nutrition.caloriesProgress)

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Macros Row
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.SpaceEvenly
            ) {
                MacroCircle("Protein", nutrition.proteinConsumed.toInt(), nutrition.proteinGoal.toInt(), Color(0xFFEF4444))
                MacroCircle("Carbs", nutrition.carbsConsumed.toInt(), nutrition.carbsGoal.toInt(), Color(0xFF22C55E))
                MacroCircle("Fat", nutrition.fatConsumed.toInt(), nutrition.fatGoal.toInt(), Color(0xFFEAB308))
            }

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Water Section
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "💧",
                    style = TextStyle(fontSize = 20.sp)
                )

                Spacer(modifier = GlanceModifier.width(8.dp))

                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = "Water",
                        style = TextStyle(
                            fontSize = 12.sp,
                            color = ColorProvider(Color.Gray)
                        )
                    )
                    Text(
                        text = "${water.glassesConsumed} / ${water.glassesGoal} glasses",
                        style = TextStyle(
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = GlanceTheme.colors.onSurface
                        )
                    )
                }

                Text(
                    text = "${(water.progress * 100).toInt()}%",
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFF06B6D4))
                    )
                )
            }
        }
    }

    @Composable
    private fun ProgressBar(progress: Float) {
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(6.dp)
                .background(Color.Gray.copy(alpha = 0.3f))
                .cornerRadius(3.dp)
        ) {
            Box(
                modifier = GlanceModifier
                    .fillMaxHeight()
                    .width((progress * 100).dp)
                    .background(Color(0xFF3B82F6))
                    .cornerRadius(3.dp)
            ) {}
        }
    }

    @Composable
    private fun MacroRow(label: String, current: Int, goal: Int, color: Color) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = GlanceModifier
                    .size(8.dp)
                    .background(color)
                    .cornerRadius(4.dp)
            ) {}

            Spacer(modifier = GlanceModifier.width(6.dp))

            Text(
                text = "$label: ${current}g",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = GlanceTheme.colors.onSurface
                )
            )
        }
    }

    @Composable
    private fun MacroCircle(label: String, current: Int, goal: Int, color: Color) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = GlanceModifier
                    .size(40.dp)
                    .background(color.copy(alpha = 0.2f))
                    .cornerRadius(20.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${current}g",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(color)
                    )
                )
            }
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 9.sp,
                    color = ColorProvider(Color.Gray)
                )
            )
        }
    }
}

class TodaySummaryWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodaySummaryWidget()
}

/**
 * Placeholder Activity for launching the main app
 */
class LaunchActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)

        // Launch the main app using the deep link scheme
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nutritionrx://"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)

        finish()
    }
}
