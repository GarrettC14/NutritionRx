package com.nutritionrx.wear.screens

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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.ScalingLazyColumn
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.rememberScalingLazyListState
import com.google.android.horologist.annotations.ExperimentalHorologistApi
import com.google.android.horologist.compose.layout.ScalingLazyColumnDefaults
import com.google.android.horologist.compose.layout.ScreenScaffold
import com.nutritionrx.wear.R
import com.nutritionrx.wear.components.CalorieRing
import com.nutritionrx.wear.data.DailySummary
import com.nutritionrx.wear.data.NutritionRepository
import com.nutritionrx.wear.data.SyncStatus
import com.nutritionrx.wear.theme.NutritionRxColors
import com.nutritionrx.wear.theme.NutritionRxWearTheme
import com.nutritionrx.wear.theme.OnSurfaceVariant

/**
 * Home screen showing daily calorie progress
 * Primary view with calorie ring, macros summary, and navigation buttons
 */
@OptIn(ExperimentalHorologistApi::class)
@Composable
fun HomeScreen(
    repository: NutritionRepository,
    onNavigateToWater: () -> Unit,
    onNavigateToQuickAdd: () -> Unit,
    onNavigateToFasting: () -> Unit = {}
) {
    val summary by repository.dailySummary.collectAsState()
    val syncStatus by repository.syncStatus.collectAsState()
    val fastingState by repository.fastingState.collectAsState()

    NutritionRxWearTheme {
        val listState = rememberScalingLazyListState()

        ScreenScaffold(
            scrollState = listState
        ) {
            ScalingLazyColumn(
                modifier = Modifier.fillMaxSize(),
                state = listState,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                item {
                    Text(
                        text = stringResource(R.string.today),
                        style = MaterialTheme.typography.title3,
                        color = MaterialTheme.colors.onSurface
                    )
                }

                // Calorie Ring
                item {
                    CalorieRing(
                        consumed = summary.calories,
                        goal = summary.calorieGoal,
                        modifier = Modifier
                            .size(140.dp)
                            .padding(vertical = 8.dp)
                    )
                }

                // Macros summary
                item {
                    MacrosSummary(summary = summary)
                }

                // Navigation buttons
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
                    ) {
                        // Water button
                        Button(
                            onClick = onNavigateToWater,
                            modifier = Modifier.size(48.dp),
                            colors = ButtonDefaults.secondaryButtonColors()
                        ) {
                            Text(
                                text = "\uD83D\uDCA7", // Water droplet emoji
                                textAlign = TextAlign.Center
                            )
                        }

                        // Quick Add button
                        Button(
                            onClick = onNavigateToQuickAdd,
                            modifier = Modifier.size(48.dp),
                            colors = ButtonDefaults.primaryButtonColors()
                        ) {
                            Text(
                                text = "+",
                                style = MaterialTheme.typography.title2.copy(
                                    fontWeight = FontWeight.Bold
                                ),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                // Fasting chip
                if (fastingState?.isEnabled == true) {
                    item {
                        Chip(
                            onClick = onNavigateToFasting,
                            label = {
                                Text(
                                    if (fastingState?.isFasting == true)
                                        "\uD83C\uDF19 Fasting"
                                    else
                                        "\uD83C\uDF7D\uFE0F Eating Window"
                                )
                            },
                            secondaryLabel = {
                                Text(
                                    if (fastingState?.isFasting == true)
                                        "Tap to view timer"
                                    else
                                        "Window open"
                                )
                            },
                            colors = ChipDefaults.secondaryChipColors(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        )
                    }
                }

                // Sync status
                item {
                    SyncStatusIndicator(
                        status = syncStatus,
                        lastSyncTime = repository.getLastSyncTimeFormatted()
                    )
                }
            }
        }
    }
}

@Composable
private fun MacrosSummary(summary: DailySummary) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        MacroItem(
            label = "P",
            value = summary.protein,
            goal = summary.proteinGoal,
            color = NutritionRxColors.macroProtein
        )
        MacroItem(
            label = "C",
            value = summary.carbs,
            goal = summary.carbsGoal,
            color = NutritionRxColors.macroCarbs
        )
        MacroItem(
            label = "F",
            value = summary.fat,
            goal = summary.fatGoal,
            color = NutritionRxColors.macroFat
        )
    }
}

@Composable
private fun MacroItem(
    label: String,
    value: Int,
    goal: Int,
    color: androidx.compose.ui.graphics.Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.caption2,
            color = color
        )
        Text(
            text = "${value}g",
            style = MaterialTheme.typography.caption1.copy(
                fontWeight = FontWeight.Bold
            ),
            color = MaterialTheme.colors.onSurface
        )
    }
}

@Composable
private fun SyncStatusIndicator(
    status: SyncStatus,
    lastSyncTime: String?
) {
    val (text, color) = when (status) {
        SyncStatus.SYNCING -> "Syncing..." to MaterialTheme.colors.secondary
        SyncStatus.ERROR -> "Sync failed" to MaterialTheme.colors.error
        SyncStatus.PHONE_NOT_CONNECTED -> "Phone not connected" to MaterialTheme.colors.error
        SyncStatus.SUCCESS, SyncStatus.IDLE -> {
            lastSyncTime?.let { "Synced $it" to OnSurfaceVariant }
                ?: ("" to OnSurfaceVariant)
        }
    }

    if (text.isNotEmpty()) {
        Text(
            text = text,
            style = MaterialTheme.typography.caption3,
            color = color,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}
