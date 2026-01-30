package com.nutritionrx.wear.data

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

/**
 * Data models for NutritionRx Wear OS app
 * These mirror the React Native app's data structures for sync compatibility
 */

/**
 * Daily nutrition summary synced from phone
 */
data class DailySummary(
    @SerializedName("date") val date: String,
    @SerializedName("calories") val calories: Int = 0,
    @SerializedName("calorieGoal") val calorieGoal: Int = 2000,
    @SerializedName("protein") val protein: Int = 0,
    @SerializedName("proteinGoal") val proteinGoal: Int = 150,
    @SerializedName("carbs") val carbs: Int = 0,
    @SerializedName("carbsGoal") val carbsGoal: Int = 250,
    @SerializedName("fat") val fat: Int = 0,
    @SerializedName("fatGoal") val fatGoal: Int = 65,
    @SerializedName("water") val water: Int = 0,
    @SerializedName("waterGoal") val waterGoal: Int = 8,
    @SerializedName("lastSyncTime") val lastSyncTime: Long = 0
) {
    val caloriesRemaining: Int
        get() = (calorieGoal - calories).coerceAtLeast(0)

    val calorieProgress: Float
        get() = if (calorieGoal > 0) (calories.toFloat() / calorieGoal).coerceIn(0f, 1f) else 0f

    val waterProgress: Float
        get() = if (waterGoal > 0) (water.toFloat() / waterGoal).coerceIn(0f, 1f) else 0f

    val proteinProgress: Float
        get() = if (proteinGoal > 0) (protein.toFloat() / proteinGoal).coerceIn(0f, 1f) else 0f

    val carbsProgress: Float
        get() = if (carbsGoal > 0) (carbs.toFloat() / carbsGoal).coerceIn(0f, 1f) else 0f

    val fatProgress: Float
        get() = if (fatGoal > 0) (fat.toFloat() / fatGoal).coerceIn(0f, 1f) else 0f

    companion object {
        fun empty(date: String = "") = DailySummary(date = date)

        fun fromJson(json: String): DailySummary? {
            return try {
                Gson().fromJson(json, DailySummary::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }

    fun toJson(): String = Gson().toJson(this)
}

/**
 * Recent food item for quick-add functionality
 */
data class RecentFood(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("calories") val calories: Int,
    @SerializedName("protein") val protein: Int = 0,
    @SerializedName("carbs") val carbs: Int = 0,
    @SerializedName("fat") val fat: Int = 0,
    @SerializedName("servingSize") val servingSize: String? = null,
    @SerializedName("lastUsed") val lastUsed: Long = 0
) {
    companion object {
        fun fromJson(json: String): RecentFood? {
            return try {
                Gson().fromJson(json, RecentFood::class.java)
            } catch (e: Exception) {
                null
            }
        }

        fun listFromJson(json: String): List<RecentFood> {
            return try {
                Gson().fromJson(json, Array<RecentFood>::class.java).toList()
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    fun toJson(): String = Gson().toJson(this)
}

/**
 * Quick add preset for common calorie amounts
 */
data class QuickAddPreset(
    val calories: Int,
    val label: String
) {
    companion object {
        val defaults = listOf(
            QuickAddPreset(100, "100"),
            QuickAddPreset(200, "200"),
            QuickAddPreset(300, "300"),
            QuickAddPreset(400, "400"),
            QuickAddPreset(500, "500")
        )
    }
}

/**
 * Sync status for phone-watch communication
 */
enum class SyncStatus {
    IDLE,
    SYNCING,
    SUCCESS,
    ERROR,
    PHONE_NOT_CONNECTED
}

/**
 * Action to send to phone app
 */
sealed class WearAction {
    data class AddWater(val glasses: Int = 1) : WearAction()
    data class QuickAdd(val calories: Int, val meal: String? = null) : WearAction()
    data class LogFood(val foodId: String) : WearAction()
    object RequestSync : WearAction()

    fun toPath(): String = when (this) {
        is AddWater -> "/action/water/add"
        is QuickAdd -> "/action/quickadd"
        is LogFood -> "/action/food/log"
        is RequestSync -> "/action/sync"
    }

    fun toData(): ByteArray {
        val json = when (this) {
            is AddWater -> """{"glasses": $glasses}"""
            is QuickAdd -> """{"calories": $calories, "meal": ${meal?.let { "\"$it\"" } ?: "null"}}"""
            is LogFood -> """{"foodId": "$foodId"}"""
            is RequestSync -> "{}"
        }
        return json.toByteArray()
    }
}

/**
 * Meal type enum matching React Native app
 */
enum class MealType(val displayName: String) {
    BREAKFAST("breakfast"),
    LUNCH("lunch"),
    DINNER("dinner"),
    SNACK("snack");

    companion object {
        fun fromTimeOfDay(): MealType {
            val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
            return when {
                hour in 5..10 -> BREAKFAST
                hour in 11..14 -> LUNCH
                hour in 15..20 -> DINNER
                else -> SNACK
            }
        }
    }
}

/**
 * Fasting state synced from phone
 */
data class FastingState(
    @SerializedName("isEnabled") val isEnabled: Boolean = false,
    @SerializedName("isFasting") val isFasting: Boolean = false,
    @SerializedName("protocol") val protocol: FastingProtocol? = null,
    @SerializedName("fastStartTime") val fastStartTime: Long? = null,
    @SerializedName("eatingWindowStart") val eatingWindowStart: String = "12:00",
    @SerializedName("eatingWindowEnd") val eatingWindowEnd: String = "20:00",
    @SerializedName("currentStreak") val currentStreak: Int = 0,
    @SerializedName("fastingPhase") val fastingPhase: FastingPhase = FastingPhase.FED
) {
    companion object {
        fun fromJson(json: String): FastingState? {
            return try {
                Gson().fromJson(json, FastingState::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }

    fun toJson(): String = Gson().toJson(this)
}

data class FastingProtocol(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("fastingHours") val fastingHours: Int,
    @SerializedName("eatingHours") val eatingHours: Int
)

enum class FastingPhase(val displayName: String, val hoursRequired: Int) {
    FED("Fed State", 0),
    FAT_BURNING("Fat Burning", 12),
    KETOSIS("Ketosis", 16),
    DEEP_KETOSIS("Deep Ketosis", 24)
}
