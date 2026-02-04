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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.ScalingLazyColumn
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.rememberScalingLazyListState
import com.google.android.horologist.annotations.ExperimentalHorologistApi
import com.google.android.horologist.compose.layout.ScreenScaffold
import com.nutritionrx.wear.data.FastingPhase
import com.nutritionrx.wear.data.FastingState
import com.nutritionrx.wear.theme.NutritionRxColors
import com.nutritionrx.wear.theme.OnSurfaceVariant
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.LocalTime
import java.time.format.DateTimeFormatter

/**
 * Fasting timer screen
 * Shows fasting or eating window state with countdown timer
 */
@OptIn(ExperimentalHorologistApi::class)
@Composable
fun FastingTimerScreen(
    fastingState: FastingState?,
    onBack: () -> Unit
) {
    when {
        fastingState == null || !fastingState.isEnabled -> {
            NotConfiguredState()
        }
        fastingState.isFasting -> {
            FastingActiveState(fastingState)
        }
        else -> {
            EatingWindowState(fastingState)
        }
    }
}

@OptIn(ExperimentalHorologistApi::class)
@Composable
private fun FastingActiveState(state: FastingState) {
    var currentTime by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            currentTime = System.currentTimeMillis()
        }
    }

    val fastStartTime = state.fastStartTime ?: currentTime
    val elapsedMs = currentTime - fastStartTime
    val elapsedHours = elapsedMs / (1000 * 60 * 60f)
    val totalFastHours = state.protocol?.fastingHours ?: 16
    val totalFastMs = totalFastHours * 60 * 60 * 1000L
    val remainingMs = (totalFastMs - elapsedMs).coerceAtLeast(0)
    val progress = (elapsedMs.toFloat() / totalFastMs).coerceIn(0f, 1f)

    val phase = when {
        elapsedHours >= 24 -> FastingPhase.DEEP_KETOSIS
        elapsedHours >= 16 -> FastingPhase.KETOSIS
        elapsedHours >= 12 -> FastingPhase.FAT_BURNING
        else -> FastingPhase.FED
    }

    val listState = rememberScalingLazyListState()

    ScreenScaffold(scrollState = listState) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // State indicator
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("\uD83C\uDF19", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "FASTING",
                        style = MaterialTheme.typography.caption1,
                        color = NutritionRxColors.sage
                    )
                }
            }

            // Large countdown
            item {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    Text(
                        text = formatDuration(remainingMs),
                        style = MaterialTheme.typography.display1,
                        color = MaterialTheme.colors.onSurface
                    )
                    Text(
                        "remaining",
                        style = MaterialTheme.typography.caption2,
                        color = OnSurfaceVariant
                    )
                }
            }

            // Progress bar
            item {
                ProgressBar(
                    progress = progress,
                    color = NutritionRxColors.sage,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                )
            }

            // Window opens time
            item {
                Text(
                    "Window opens ${state.eatingWindowStart}",
                    style = MaterialTheme.typography.caption2,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            // Fasting phase
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Text("\uD83D\uDD25", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        phase.displayName,
                        style = MaterialTheme.typography.caption2,
                        color = NutritionRxColors.sage
                    )
                }
            }

            // Protocol badge
            item {
                Text(
                    state.protocol?.name ?: "16:8",
                    style = MaterialTheme.typography.caption2,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalHorologistApi::class)
@Composable
private fun EatingWindowState(state: FastingState) {
    var currentTime by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            currentTime = System.currentTimeMillis()
        }
    }

    val now = LocalTime.now()
    val windowEnd = LocalTime.parse(state.eatingWindowEnd, DateTimeFormatter.ofPattern("HH:mm"))
    val remainingMs = Duration.between(now, windowEnd).toMillis()
        .let { if (it < 0) it + 24 * 60 * 60 * 1000 else it }

    val eatingHours = state.protocol?.eatingHours ?: 8
    val totalEatingMs = eatingHours * 60 * 60 * 1000L
    val elapsedEatingMs = (totalEatingMs - remainingMs).coerceAtLeast(0)
    val progress = (elapsedEatingMs.toFloat() / totalEatingMs).coerceIn(0f, 1f)

    val listState = rememberScalingLazyListState()

    ScreenScaffold(scrollState = listState) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // State indicator
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("\uD83C\uDF7D\uFE0F", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "EATING WINDOW",
                        style = MaterialTheme.typography.caption1,
                        color = NutritionRxColors.terracotta
                    )
                }
            }

            // Time remaining
            item {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    Text(
                        text = formatDuration(remainingMs),
                        style = MaterialTheme.typography.display1,
                        color = MaterialTheme.colors.onSurface
                    )
                    Text(
                        "left",
                        style = MaterialTheme.typography.caption2,
                        color = OnSurfaceVariant
                    )
                }
            }

            // Progress bar
            item {
                ProgressBar(
                    progress = progress,
                    color = NutritionRxColors.terracotta,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                )
            }

            // Fast begins time
            item {
                Text(
                    "Fast begins ${state.eatingWindowEnd}",
                    style = MaterialTheme.typography.caption2,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            // Streak
            if (state.currentStreak > 0) {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Text("\uD83D\uDD25", fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "${state.currentStreak} day streak",
                            style = MaterialTheme.typography.caption2,
                            color = NutritionRxColors.sage
                        )
                    }
                }
            }

            // Protocol badge
            item {
                Text(
                    state.protocol?.name ?: "16:8",
                    style = MaterialTheme.typography.caption2,
                    color = OnSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalHorologistApi::class)
@Composable
private fun NotConfiguredState() {
    val listState = rememberScalingLazyListState()

    ScreenScaffold(scrollState = listState) {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = listState,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            item {
                Text("\u23F1\uFE0F", fontSize = 32.sp)
            }

            item {
                Spacer(modifier = Modifier.height(12.dp))
            }

            item {
                Text(
                    "Fasting not set up",
                    style = MaterialTheme.typography.title3,
                    color = MaterialTheme.colors.onSurface,
                    textAlign = TextAlign.Center
                )
            }

            item {
                Text(
                    "Configure in NutritionRx app",
                    style = MaterialTheme.typography.caption2,
                    color = OnSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun ProgressBar(
    progress: Float,
    color: Color,
    modifier: Modifier = Modifier,
    trackColor: Color = Color(0xFF333333)
) {
    Box(
        modifier = modifier
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(trackColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color)
        )
    }
}

private fun formatDuration(millis: Long): String {
    if (millis <= 0) return "0:00"
    val totalSeconds = millis / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    return if (hours > 0) {
        "%d:%02d".format(hours, minutes)
    } else {
        "%d:%02d".format(minutes, totalSeconds % 60)
    }
}
