package com.nutritionrx.wear.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Typography

/**
 * NutritionRx Wear Theme
 * "Nourished Calm" design philosophy adapted for Wear OS
 *
 * Colors are optimized for AMOLED displays with true black backgrounds.
 * Typography uses system defaults for optimal readability on small screens.
 */

// Primary Colors - Green for nutrition/health
val Primary = Color(0xFF58A663)
val PrimaryVariant = Color(0xFF4A8F54)
val OnPrimary = Color.White

// Secondary Colors - Blue for water/hydration
val Secondary = Color(0xFF7DBDE8)
val SecondaryVariant = Color(0xFF5BAEE0)
val OnSecondary = Color.White

// Surface Colors - Dark theme optimized for AMOLED
val Surface = Color(0xFF1A1A1A)
val SurfaceVariant = Color(0xFF2D2D2D)
val OnSurface = Color.White
val OnSurfaceVariant = Color(0xFFB3B3B3)

// Background Colors
val Background = Color.Black
val OnBackground = Color.White

// Status Colors
val Error = Color(0xFFCF6679)
val OnError = Color.White
val Success = Color(0xFF58A663)

// Progress Ring Colors
val RingBackground = Color(0xFF333333)
val RingCalories = Color(0xFF58A663)
val RingWater = Color(0xFF7DBDE8)

// Macro Colors
val MacroProtein = Color(0xFFE07B7B)
val MacroCarbs = Color(0xFF7DBDE8)
val MacroFat = Color(0xFFE8D57D)

private val NutritionRxColorPalette = Colors(
    primary = Primary,
    primaryVariant = PrimaryVariant,
    secondary = Secondary,
    secondaryVariant = SecondaryVariant,
    error = Error,
    onPrimary = OnPrimary,
    onSecondary = OnSecondary,
    onError = OnError,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnSurface,
    onSurfaceVariant = OnSurfaceVariant,
)

@Composable
fun NutritionRxWearTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colors = NutritionRxColorPalette,
        typography = Typography(),
        content = content
    )
}

/**
 * Color extensions for consistent usage throughout the app
 */
object NutritionRxColors {
    val ringBackground = RingBackground
    val ringCalories = RingCalories
    val ringWater = RingWater
    val macroProtein = MacroProtein
    val macroCarbs = MacroCarbs
    val macroFat = MacroFat
    val success = Success
}
