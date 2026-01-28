package com.nutritionrx.wear.screens

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.getSystemService
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
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
import com.nutritionrx.wear.data.QuickAddPreset
import com.nutritionrx.wear.data.WearAction
import com.nutritionrx.wear.data.WearDataService
import com.nutritionrx.wear.theme.NutritionRxColors
import com.nutritionrx.wear.theme.NutritionRxWearTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Quick Add screen
 * Shows preset calorie amounts for fast logging
 */
@OptIn(ExperimentalHorologistApi::class)
@Composable
fun QuickAddScreen(
    repository: NutritionRepository,
    dataService: WearDataService,
    onNavigateToRecent: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val listState = rememberScalingLazyListState()

    var showConfirmation by remember { mutableStateOf(false) }
    var confirmationCalories by remember { mutableStateOf(0) }

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
                            text = stringResource(R.string.quick_add),
                            style = MaterialTheme.typography.title3,
                            color = MaterialTheme.colors.onSurface
                        )
                    }

                    // Quick add presets
                    items(QuickAddPreset.defaults) { preset ->
                        QuickAddChip(
                            preset = preset,
                            onClick = {
                                scope.launch {
                                    // Haptic feedback
                                    vibrator?.vibrate(
                                        VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                                    )

                                    // Send to phone
                                    dataService.sendAction(WearAction.QuickAdd(preset.calories))

                                    // Show confirmation
                                    confirmationCalories = preset.calories
                                    showConfirmation = true

                                    delay(1500)
                                    showConfirmation = false
                                }
                            }
                        )
                    }

                    // Recent foods button
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Chip(
                            onClick = onNavigateToRecent,
                            label = {
                                Text(
                                    text = stringResource(R.string.recent_foods),
                                    style = MaterialTheme.typography.button
                                )
                            },
                            colors = ChipDefaults.secondaryChipColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Confirmation overlay
                AnimatedVisibility(
                    visible = showConfirmation,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut() + scaleOut(),
                    modifier = Modifier.align(Alignment.Center)
                ) {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(NutritionRxColors.success.copy(alpha = 0.9f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "+$confirmationCalories",
                                style = MaterialTheme.typography.title1.copy(
                                    fontWeight = FontWeight.Bold
                                ),
                                color = MaterialTheme.colors.onPrimary
                            )
                            Text(
                                text = stringResource(R.string.cal),
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

@Composable
private fun QuickAddChip(
    preset: QuickAddPreset,
    onClick: () -> Unit
) {
    Chip(
        onClick = onClick,
        label = {
            Text(
                text = "${preset.calories}",
                style = MaterialTheme.typography.title3.copy(
                    fontWeight = FontWeight.Bold
                )
            )
        },
        secondaryLabel = {
            Text(
                text = "cal",
                style = MaterialTheme.typography.caption2
            )
        },
        colors = ChipDefaults.primaryChipColors(),
        modifier = Modifier.fillMaxWidth()
    )
}
