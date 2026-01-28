package com.nutritionrx.wear.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.nutritionrx.wear.theme.NutritionRxColors
import kotlin.math.min

/**
 * Animated calorie progress ring
 * Shows calories consumed with remaining calories in center
 */
@Composable
fun CalorieRing(
    consumed: Int,
    goal: Int,
    modifier: Modifier = Modifier,
    ringColor: Color = NutritionRxColors.ringCalories,
    backgroundColor: Color = NutritionRxColors.ringBackground,
    strokeWidth: Dp = 12.dp,
    showRemaining: Boolean = true
) {
    val progress = if (goal > 0) {
        (consumed.toFloat() / goal).coerceIn(0f, 1f)
    } else {
        0f
    }

    val remaining = (goal - consumed).coerceAtLeast(0)

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        // Progress ring
        Canvas(modifier = Modifier.fillMaxSize().padding(8.dp)) {
            val diameter = min(size.width, size.height)
            val radius = diameter / 2
            val strokePx = strokeWidth.toPx()
            val arcSize = Size(diameter - strokePx, diameter - strokePx)
            val topLeft = Offset(
                (size.width - arcSize.width) / 2,
                (size.height - arcSize.height) / 2
            )

            // Background ring
            drawArc(
                color = backgroundColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Progress ring
            if (progress > 0) {
                drawArc(
                    color = ringColor,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokePx, cap = StrokeCap.Round)
                )
            }
        }

        // Center text
        if (showRemaining) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = remaining.toString(),
                    style = MaterialTheme.typography.display1.copy(
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colors.onSurface
                )
                Text(
                    text = "remaining",
                    style = MaterialTheme.typography.caption2,
                    color = MaterialTheme.colors.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Compact calorie ring for tiles and complications
 */
@Composable
fun CompactCalorieRing(
    consumed: Int,
    goal: Int,
    modifier: Modifier = Modifier
) {
    val progress = if (goal > 0) {
        (consumed.toFloat() / goal).coerceIn(0f, 1f)
    } else {
        0f
    }

    Box(
        modifier = modifier.size(48.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val diameter = min(size.width, size.height)
            val strokePx = 4.dp.toPx()
            val arcSize = Size(diameter - strokePx, diameter - strokePx)
            val topLeft = Offset(
                (size.width - arcSize.width) / 2,
                (size.height - arcSize.height) / 2
            )

            // Background
            drawArc(
                color = NutritionRxColors.ringBackground,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )

            // Progress
            if (progress > 0) {
                drawArc(
                    color = NutritionRxColors.ringCalories,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokePx, cap = StrokeCap.Round)
                )
            }
        }

        Text(
            text = consumed.toString(),
            style = MaterialTheme.typography.caption1.copy(
                fontWeight = FontWeight.Bold
            ),
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Water progress ring
 */
@Composable
fun WaterRing(
    glasses: Int,
    goal: Int,
    modifier: Modifier = Modifier
) {
    CalorieRing(
        consumed = glasses,
        goal = goal,
        modifier = modifier,
        ringColor = NutritionRxColors.ringWater,
        showRemaining = false
    )
}
