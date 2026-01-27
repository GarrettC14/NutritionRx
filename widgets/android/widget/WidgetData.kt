package com.nutritionrx.app.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Widget Data Models
 * Matches iOS Swift structures for cross-platform consistency
 */

object WidgetConstants {
    const val SHARED_PREFS_NAME = "nutritionrx_widget_data"
    const val WIDGET_DATA_KEY = "widget_data"
    const val UPDATE_INTERVAL_MINUTES = 15L
}

data class NutritionData(
    val caloriesConsumed: Int = 0,
    val caloriesGoal: Int = 2000,
    val proteinConsumed: Double = 0.0,
    val proteinGoal: Double = 150.0,
    val carbsConsumed: Double = 0.0,
    val carbsGoal: Double = 250.0,
    val fatConsumed: Double = 0.0,
    val fatGoal: Double = 65.0,
    val lastUpdated: String = ""
) {
    val caloriesRemaining: Int
        get() = maxOf(0, caloriesGoal - caloriesConsumed)

    val caloriesProgress: Float
        get() = if (caloriesGoal > 0) {
            minOf(1f, caloriesConsumed.toFloat() / caloriesGoal.toFloat())
        } else 0f

    companion object {
        val placeholder = NutritionData(
            caloriesConsumed = 1200,
            caloriesGoal = 2000,
            proteinConsumed = 80.0,
            proteinGoal = 150.0,
            carbsConsumed = 150.0,
            carbsGoal = 250.0,
            fatConsumed = 40.0,
            fatGoal = 65.0,
            lastUpdated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        )
    }
}

data class WaterData(
    val glassesConsumed: Int = 0,
    val glassesGoal: Int = 8,
    val glassSizeMl: Int = 250,
    val lastUpdated: String = ""
) {
    val progress: Float
        get() = if (glassesGoal > 0) {
            minOf(1f, glassesConsumed.toFloat() / glassesGoal.toFloat())
        } else 0f

    val glassesRemaining: Int
        get() = maxOf(0, glassesGoal - glassesConsumed)

    val consumedMl: Int
        get() = glassesConsumed * glassSizeMl

    val goalMl: Int
        get() = glassesGoal * glassSizeMl

    companion object {
        val placeholder = WaterData(
            glassesConsumed = 4,
            glassesGoal = 8,
            glassSizeMl = 250,
            lastUpdated = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
        )
    }
}

data class WidgetDataContainer(
    val nutrition: NutritionData = NutritionData(),
    val water: WaterData = WaterData(),
    val date: String = ""
) {
    companion object {
        val placeholder = WidgetDataContainer(
            nutrition = NutritionData.placeholder,
            water = WaterData.placeholder,
            date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        )
    }
}

/**
 * Widget Data Provider
 * Handles reading/writing widget data to SharedPreferences
 */
class WidgetDataProvider private constructor(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        WidgetConstants.SHARED_PREFS_NAME,
        Context.MODE_PRIVATE
    )

    fun loadData(): WidgetDataContainer? {
        val json = prefs.getString(WidgetConstants.WIDGET_DATA_KEY, null) ?: return null

        return try {
            val obj = JSONObject(json)

            val nutritionObj = obj.optJSONObject("nutrition")
            val nutrition = if (nutritionObj != null) {
                NutritionData(
                    caloriesConsumed = nutritionObj.optInt("caloriesConsumed", 0),
                    caloriesGoal = nutritionObj.optInt("caloriesGoal", 2000),
                    proteinConsumed = nutritionObj.optDouble("proteinConsumed", 0.0),
                    proteinGoal = nutritionObj.optDouble("proteinGoal", 150.0),
                    carbsConsumed = nutritionObj.optDouble("carbsConsumed", 0.0),
                    carbsGoal = nutritionObj.optDouble("carbsGoal", 250.0),
                    fatConsumed = nutritionObj.optDouble("fatConsumed", 0.0),
                    fatGoal = nutritionObj.optDouble("fatGoal", 65.0),
                    lastUpdated = nutritionObj.optString("lastUpdated", "")
                )
            } else NutritionData()

            val waterObj = obj.optJSONObject("water")
            val water = if (waterObj != null) {
                WaterData(
                    glassesConsumed = waterObj.optInt("glassesConsumed", 0),
                    glassesGoal = waterObj.optInt("glassesGoal", 8),
                    glassSizeMl = waterObj.optInt("glassSizeMl", 250),
                    lastUpdated = waterObj.optString("lastUpdated", "")
                )
            } else WaterData()

            WidgetDataContainer(
                nutrition = nutrition,
                water = water,
                date = obj.optString("date", "")
            )
        } catch (e: Exception) {
            null
        }
    }

    fun getCurrentData(): WidgetDataContainer {
        return loadData() ?: WidgetDataContainer.placeholder
    }

    companion object {
        @Volatile
        private var instance: WidgetDataProvider? = null

        fun getInstance(context: Context): WidgetDataProvider {
            return instance ?: synchronized(this) {
                instance ?: WidgetDataProvider(context.applicationContext).also { instance = it }
            }
        }
    }
}
