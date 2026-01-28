package com.nutritionrx.wear.screens

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.getSystemService
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.ScalingLazyColumn
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.items
import androidx.wear.compose.material.rememberScalingLazyListState
import com.google.android.horologist.annotations.ExperimentalHorologistApi
import com.google.android.horologist.compose.layout.ScreenScaffold
import com.nutritionrx.wear.R
import com.nutritionrx.wear.data.NutritionRepository
import com.nutritionrx.wear.data.RecentFood
import com.nutritionrx.wear.data.WearAction
import com.nutritionrx.wear.data.WearDataService
import com.nutritionrx.wear.theme.NutritionRxColors
import com.nutritionrx.wear.theme.NutritionRxWearTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Recent Foods screen
 * Shows recently logged foods for quick re-logging
 */
@OptIn(ExperimentalHorologistApi::class)
@Composable
fun RecentFoodsScreen(
    repository: NutritionRepository,
    dataService: WearDataService,
    onBack: () -> Unit
) {
    val recentFoods by repository.recentFoods.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val listState = rememberScalingLazyListState()

    var showConfirmation by remember { mutableStateOf(false) }
    var confirmationFood by remember { mutableStateOf<RecentFood?>(null) }

    val vibrator = remember { context.getSystemService<Vibrator>() }

    NutritionRxWearTheme {
        ScreenScaffold(scrollState = listState) {
            Box(modifier = Modifier.fillMaxSize()) {
                ScalingLazyColumn(
                    state = listState,
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Title
                    item {
                        Text(
                            text = stringResource(R.string.recent_foods),
                            style = MaterialTheme.typography.title3,
                            color = MaterialTheme.colors.onSurface
                        )
                    }

                    if (recentFoods.isEmpty()) {
                        // Empty state
                        item {
                            Text(
                                text = "No recent foods.\nLog foods on your phone first.",
                                style = MaterialTheme.typography.body2,
                                color = MaterialTheme.colors.onSurfaceVariant,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    } else {
                        // Recent food items
                        items(recentFoods.take(10)) { food ->
                            RecentFoodChip(
                                food = food,
                                onClick = {
                                    scope.launch {
                                        // Haptic feedback
                                        vibrator?.vibrate(
                                            VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                                        )

                                        // Send to phone
                                        dataService.sendAction(WearAction.LogFood(food.id))

                                        // Optimistic update
                                        repository.addCalories(food.calories)

                                        // Show confirmation
                                        confirmationFood = food
                                        showConfirmation = true

                                        delay(1500)
                                        showConfirmation = false
                                    }
                                }
                            )
                        }
                    }
                }

                // Confirmation overlay
                AnimatedVisibility(
                    visible = showConfirmation,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut() + scaleOut(),
                    modifier = Modifier.align(Alignment.Center)
                ) {
                    confirmationFood?.let { food ->
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .background(NutritionRxColors.success.copy(alpha = 0.9f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(8.dp)
                            ) {
                                Text(
                                    text = food.name,
                                    style = MaterialTheme.typography.caption1.copy(
                                        fontWeight = FontWeight.Bold
                                    ),
                                    color = MaterialTheme.colors.onPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "+${food.calories} cal",
                                    style = MaterialTheme.typography.caption2,
                                    color = MaterialTheme.colors.onPrimary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentFoodChip(
    food: RecentFood,
    onClick: () -> Unit
) {
    Chip(
        onClick = onClick,
        label = {
            Text(
                text = food.name,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        secondaryLabel = {
            Text(
                text = "${food.calories} cal" + (food.servingSize?.let { " · $it" } ?: "")
            )
        },
        colors = ChipDefaults.secondaryChipColors(),
        modifier = Modifier.fillMaxWidth()
    )
}
