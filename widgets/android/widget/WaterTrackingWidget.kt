package com.nutritionrx.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Water Tracking Widget
 * Displays daily water intake progress
 */
class WaterTrackingWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),  // Small
            DpSize(200.dp, 110.dp),  // Medium
        )
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataProvider.getInstance(context).getCurrentData()

        provideContent {
            WidgetContent(data.water)
        }
    }

    @Composable
    private fun WidgetContent(water: WaterData) {
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
                    size.width < 180.dp -> SmallContent(water)
                    else -> MediumContent(water)
                }
            }
        }
    }

    @Composable
    private fun SmallContent(water: WaterData) {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Water icon
            Text(
                text = "💧",
                style = TextStyle(fontSize = 24.sp)
            )

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Progress circle visualization
            Box(
                modifier = GlanceModifier
                    .size(60.dp)
                    .background(Color(0xFF06B6D4).copy(alpha = 0.2f))
                    .cornerRadius(30.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "${water.glassesConsumed}",
                        style = TextStyle(
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = GlanceTheme.colors.onSurface
                        )
                    )
                    Text(
                        text = "of ${water.glassesGoal}",
                        style = TextStyle(
                            fontSize = 10.sp,
                            color = ColorProvider(Color.Gray)
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.height(4.dp))

            Text(
                text = "glasses",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = ColorProvider(Color.Gray)
                )
            )
        }
    }

    @Composable
    private fun MediumContent(water: WaterData) {
        Row(
            modifier = GlanceModifier.fillMaxSize().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Progress visualization
            Box(
                modifier = GlanceModifier
                    .size(80.dp)
                    .background(Color(0xFF06B6D4).copy(alpha = 0.2f))
                    .cornerRadius(40.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "${water.glassesConsumed}",
                        style = TextStyle(
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(Color(0xFF06B6D4))
                        )
                    )
                    Text(
                        text = "of ${water.glassesGoal}",
                        style = TextStyle(
                            fontSize = 12.sp,
                            color = ColorProvider(Color.Gray)
                        )
                    )
                }
            }

            Spacer(modifier = GlanceModifier.width(16.dp))

            // Right: Info
            Column(
                modifier = GlanceModifier.defaultWeight()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "💧",
                        style = TextStyle(fontSize = 16.sp)
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = "Water Intake",
                        style = TextStyle(
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = GlanceTheme.colors.onSurface
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.height(4.dp))

                Text(
                    text = "${water.consumedMl} mL",
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = GlanceTheme.colors.onSurface
                    )
                )

                Text(
                    text = "Goal: ${water.goalMl} mL",
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Spacer(modifier = GlanceModifier.height(8.dp))

                // Glass indicators
                Row {
                    repeat(minOf(water.glassesGoal, 10)) { index ->
                        Text(
                            text = if (index < water.glassesConsumed) "💧" else "○",
                            style = TextStyle(
                                fontSize = 12.sp,
                                color = if (index < water.glassesConsumed) {
                                    ColorProvider(Color(0xFF06B6D4))
                                } else {
                                    ColorProvider(Color.Gray)
                                }
                            )
                        )
                    }
                }
            }
        }
    }
}

class WaterTrackingWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WaterTrackingWidget()
}
