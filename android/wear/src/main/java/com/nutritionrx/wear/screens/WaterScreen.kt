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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.google.android.horologist.annotations.ExperimentalHorologistApi
import com.google.android.horologist.compose.layout.ScreenScaffold
import com.nutritionrx.wear.R
import com.nutritionrx.wear.components.WaterRing
import com.nutritionrx.wear.data.NutritionRepository
import com.nutritionrx.wear.data.WearAction
import com.nutritionrx.wear.data.WearDataService
import com.nutritionrx.wear.theme.NutritionRxColors
import com.nutritionrx.wear.theme.NutritionRxWearTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Water tracking screen
 * Shows current water count with large tap target to add glasses
 */
@OptIn(ExperimentalHorologistApi::class)
@Composable
fun WaterScreen(
    repository: NutritionRepository,
    dataService: WearDataService,
    onBack: () -> Unit
) {
    val summary by repository.dailySummary.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var showConfirmation by remember { mutableStateOf(false) }
    var confirmationText by remember { mutableStateOf("") }

    val vibrator = remember { context.getSystemService<Vibrator>() }

    NutritionRxWearTheme {
        ScreenScaffold {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Title
                    Text(
                        text = stringResource(R.string.water),
                        style = MaterialTheme.typography.title3,
                        color = MaterialTheme.colors.onSurface
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Water ring with current count
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(120.dp)
                    ) {
                        WaterRing(
                            glasses = summary.water,
                            goal = summary.waterGoal,
                            modifier = Modifier.fillMaxSize()
                        )

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = summary.water.toString(),
                                style = MaterialTheme.typography.display2.copy(
                                    fontWeight = FontWeight.Bold
                                ),
                                color = NutritionRxColors.ringWater
                            )
                            Text(
                                text = "of ${summary.waterGoal}",
                                style = MaterialTheme.typography.caption2,
                                color = MaterialTheme.colors.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Add water button
                    Button(
                        onClick = {
                            scope.launch {
                                // Haptic feedback
                                vibrator?.vibrate(
                                    VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                                )

                                // Check if goal will be reached
                                val goalReached = summary.water + 1 >= summary.waterGoal &&
                                        summary.water < summary.waterGoal

                                // Send to phone (with optimistic local update)
                                dataService.sendAction(WearAction.AddWater(1))

                                // Show confirmation
                                confirmationText = if (goalReached) {
                                    context.getString(R.string.water_goal_reached)
                                } else {
                                    context.getString(R.string.water_added)
                                }
                                showConfirmation = true

                                // Extra haptic for goal reached
                                if (goalReached) {
                                    delay(100)
                                    vibrator?.vibrate(
                                        VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
                                    )
                                }

                                // Hide confirmation after delay
                                delay(1500)
                                showConfirmation = false
                            }
                        },
                        modifier = Modifier.size(64.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = NutritionRxColors.ringWater
                        )
                    ) {
                        Text(
                            text = "+",
                            style = MaterialTheme.typography.display3.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = MaterialTheme.colors.onSecondary
                        )
                    }

                    Text(
                        text = stringResource(R.string.add_water),
                        style = MaterialTheme.typography.caption2,
                        color = MaterialTheme.colors.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                // Confirmation overlay
                AnimatedVisibility(
                    visible = showConfirmation,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut() + scaleOut()
                ) {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(NutritionRxColors.ringWater.copy(alpha = 0.9f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = confirmationText,
                            style = MaterialTheme.typography.caption1.copy(
                                fontWeight = FontWeight.Bold
                            ),
                            color = MaterialTheme.colors.onSecondary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }
            }
        }
    }
}
