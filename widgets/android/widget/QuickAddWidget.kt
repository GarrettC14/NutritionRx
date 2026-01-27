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
 * Quick Add Widget
 * Quick access to add food for different meals
 */
class QuickAddWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),  // Small
            DpSize(200.dp, 110.dp),  // Medium
        )
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataProvider.getInstance(context).getCurrentData()

        provideContent {
            WidgetContent(data.nutrition)
        }
    }

    @Composable
    private fun WidgetContent(nutrition: NutritionData) {
        val size = LocalSize.current

        GlanceTheme {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(GlanceTheme.colors.widgetBackground)
                    .cornerRadius(16.dp),
                contentAlignment = Alignment.Center
            ) {
                when {
                    size.width < 180.dp -> SmallContent(nutrition)
                    else -> MediumContent(nutrition)
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
            // Status
            Text(
                text = "${nutrition.caloriesRemaining}",
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = GlanceTheme.colors.onSurface
                )
            )

            Text(
                text = "cal remaining",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = ColorProvider(Color.Gray)
                )
            )

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Add button
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .height(32.dp)
                    .background(Color(0xFF3B82F6))
                    .cornerRadius(8.dp)
                    .clickable(actionRunCallback<AddFoodAction>()),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "➕",
                        style = TextStyle(fontSize = 14.sp)
                    )
                    Spacer(modifier = GlanceModifier.width(4.dp))
                    Text(
                        text = "Add Food",
                        style = TextStyle(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = ColorProvider(Color.White)
                        )
                    )
                }
            }
        }
    }

    @Composable
    private fun MediumContent(nutrition: NutritionData) {
        Row(
            modifier = GlanceModifier.fillMaxSize().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Status
            Column(
                modifier = GlanceModifier.defaultWeight()
            ) {
                Text(
                    text = "Today",
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Text(
                    text = "${nutrition.caloriesConsumed}",
                    style = TextStyle(
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = GlanceTheme.colors.onSurface
                    )
                )

                Text(
                    text = "${nutrition.caloriesRemaining} cal remaining",
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Spacer(modifier = GlanceModifier.height(8.dp))

                // Progress bar
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(Color.Gray.copy(alpha = 0.3f))
                        .cornerRadius(2.dp)
                ) {
                    Box(
                        modifier = GlanceModifier
                            .fillMaxHeight()
                            .width((nutrition.caloriesProgress * 100).dp)
                            .background(Color(0xFF3B82F6))
                            .cornerRadius(2.dp)
                    ) {}
                }
            }

            Spacer(modifier = GlanceModifier.width(16.dp))

            // Right: Quick add buttons
            Column(
                modifier = GlanceModifier.defaultWeight(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Quick Add",
                    style = TextStyle(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(Color.Gray)
                    )
                )

                Spacer(modifier = GlanceModifier.height(8.dp))

                // 2x2 grid of meal buttons
                Column {
                    Row {
                        MealButton("🌅", "Breakfast", Color(0xFFF97316), "breakfast")
                        Spacer(modifier = GlanceModifier.width(4.dp))
                        MealButton("☀️", "Lunch", Color(0xFFEAB308), "lunch")
                    }
                    Spacer(modifier = GlanceModifier.height(4.dp))
                    Row {
                        MealButton("🌙", "Dinner", Color(0xFF8B5CF6), "dinner")
                        Spacer(modifier = GlanceModifier.width(4.dp))
                        MealButton("🍃", "Snack", Color(0xFF22C55E), "snack")
                    }
                }
            }
        }
    }

    @Composable
    private fun MealButton(icon: String, label: String, color: Color, meal: String) {
        Box(
            modifier = GlanceModifier
                .size(40.dp)
                .background(color.copy(alpha = 0.15f))
                .cornerRadius(8.dp)
                .clickable(actionRunCallback<AddMealAction>(
                    actionParametersOf(mealParameter to meal)
                )),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = icon,
                style = TextStyle(fontSize = 16.sp)
            )
        }
    }

    companion object {
        val mealParameter = ActionParameters.Key<String>("meal")
    }
}

class QuickAddWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = QuickAddWidget()
}

/**
 * Action to add food to a specific meal
 */
class AddMealAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val meal = parameters[QuickAddWidget.mealParameter] ?: "snack"

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nutritionrx://add-food?meal=$meal"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }
}

/**
 * Action to add food (general)
 */
class AddFoodAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nutritionrx://add-food"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }
}
