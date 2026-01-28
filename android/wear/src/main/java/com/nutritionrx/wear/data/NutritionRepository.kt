package com.nutritionrx.wear.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Repository for nutrition data on Wear OS
 * Manages local cache and sync state with phone app
 */
class NutritionRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    private val _dailySummary = MutableStateFlow(loadDailySummary())
    val dailySummary: StateFlow<DailySummary> = _dailySummary.asStateFlow()

    private val _recentFoods = MutableStateFlow(loadRecentFoods())
    val recentFoods: StateFlow<List<RecentFood>> = _recentFoods.asStateFlow()

    private val _syncStatus = MutableStateFlow(SyncStatus.IDLE)
    val syncStatus: StateFlow<SyncStatus> = _syncStatus.asStateFlow()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * Get today's date string
     */
    fun getTodayDate(): String = dateFormat.format(Date())

    /**
     * Update daily summary from phone sync
     */
    fun updateDailySummary(summary: DailySummary) {
        _dailySummary.value = summary
        saveDailySummary(summary)
    }

    /**
     * Increment water count locally (optimistic update)
     */
    fun incrementWater(glasses: Int = 1) {
        val current = _dailySummary.value
        val updated = current.copy(
            water = current.water + glasses,
            lastSyncTime = System.currentTimeMillis()
        )
        _dailySummary.value = updated
        saveDailySummary(updated)
    }

    /**
     * Add calories locally (optimistic update)
     */
    fun addCalories(calories: Int) {
        val current = _dailySummary.value
        val updated = current.copy(
            calories = current.calories + calories,
            lastSyncTime = System.currentTimeMillis()
        )
        _dailySummary.value = updated
        saveDailySummary(updated)
    }

    /**
     * Update recent foods from phone sync
     */
    fun updateRecentFoods(foods: List<RecentFood>) {
        _recentFoods.value = foods
        saveRecentFoods(foods)
    }

    /**
     * Update sync status
     */
    fun setSyncStatus(status: SyncStatus) {
        _syncStatus.value = status
    }

    /**
     * Get last sync time formatted string
     */
    fun getLastSyncTimeFormatted(): String? {
        val lastSync = _dailySummary.value.lastSyncTime
        if (lastSync == 0L) return null

        val now = System.currentTimeMillis()
        val diff = now - lastSync

        return when {
            diff < 60_000 -> "just now"
            diff < 3600_000 -> "${diff / 60_000}m ago"
            diff < 86400_000 -> "${diff / 3600_000}h ago"
            else -> "over a day ago"
        }
    }

    /**
     * Check if data is stale (over 1 hour old)
     */
    fun isDataStale(): Boolean {
        val lastSync = _dailySummary.value.lastSyncTime
        if (lastSync == 0L) return true

        val diff = System.currentTimeMillis() - lastSync
        return diff > 3600_000 // 1 hour
    }

    /**
     * Check if we need to reset for new day
     */
    fun checkAndResetForNewDay() {
        val today = getTodayDate()
        val currentDate = _dailySummary.value.date

        if (currentDate != today) {
            // Reset to empty for new day
            val newSummary = DailySummary.empty(today).copy(
                calorieGoal = _dailySummary.value.calorieGoal,
                proteinGoal = _dailySummary.value.proteinGoal,
                carbsGoal = _dailySummary.value.carbsGoal,
                fatGoal = _dailySummary.value.fatGoal,
                waterGoal = _dailySummary.value.waterGoal
            )
            _dailySummary.value = newSummary
            saveDailySummary(newSummary)
        }
    }

    // ---- Persistence ----

    private fun loadDailySummary(): DailySummary {
        val json = prefs.getString(KEY_DAILY_SUMMARY, null)
        val summary = json?.let { DailySummary.fromJson(it) } ?: DailySummary.empty(getTodayDate())

        // Check if it's a new day
        return if (summary.date != getTodayDate()) {
            DailySummary.empty(getTodayDate()).copy(
                calorieGoal = summary.calorieGoal,
                proteinGoal = summary.proteinGoal,
                carbsGoal = summary.carbsGoal,
                fatGoal = summary.fatGoal,
                waterGoal = summary.waterGoal
            )
        } else {
            summary
        }
    }

    private fun saveDailySummary(summary: DailySummary) {
        prefs.edit().putString(KEY_DAILY_SUMMARY, summary.toJson()).apply()
    }

    private fun loadRecentFoods(): List<RecentFood> {
        val json = prefs.getString(KEY_RECENT_FOODS, null) ?: return emptyList()
        return RecentFood.listFromJson(json)
    }

    private fun saveRecentFoods(foods: List<RecentFood>) {
        val json = com.google.gson.Gson().toJson(foods)
        prefs.edit().putString(KEY_RECENT_FOODS, json).apply()
    }

    companion object {
        private const val PREFS_NAME = "nutritionrx_wear"
        private const val KEY_DAILY_SUMMARY = "daily_summary"
        private const val KEY_RECENT_FOODS = "recent_foods"

        @Volatile
        private var instance: NutritionRepository? = null

        fun getInstance(context: Context): NutritionRepository {
            return instance ?: synchronized(this) {
                instance ?: NutritionRepository(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}
