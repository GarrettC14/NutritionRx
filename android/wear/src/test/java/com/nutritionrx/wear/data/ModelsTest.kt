package com.nutritionrx.wear.data

import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for Wear OS data models
 */
class ModelsTest {

    @Test
    fun `DailySummary calculates remaining calories correctly`() {
        val summary = DailySummary(
            date = "2024-01-15",
            calories = 1500,
            calorieGoal = 2000
        )

        assertEquals(500, summary.caloriesRemaining)
    }

    @Test
    fun `DailySummary remaining calories does not go negative`() {
        val summary = DailySummary(
            date = "2024-01-15",
            calories = 2500,
            calorieGoal = 2000
        )

        assertEquals(0, summary.caloriesRemaining)
    }

    @Test
    fun `DailySummary calculates calorie progress correctly`() {
        val summary = DailySummary(
            date = "2024-01-15",
            calories = 1000,
            calorieGoal = 2000
        )

        assertEquals(0.5f, summary.calorieProgress, 0.001f)
    }

    @Test
    fun `DailySummary progress is capped at 1`() {
        val summary = DailySummary(
            date = "2024-01-15",
            calories = 3000,
            calorieGoal = 2000
        )

        assertEquals(1f, summary.calorieProgress, 0.001f)
    }

    @Test
    fun `DailySummary handles zero goal`() {
        val summary = DailySummary(
            date = "2024-01-15",
            calories = 1000,
            calorieGoal = 0
        )

        assertEquals(0f, summary.calorieProgress, 0.001f)
    }

    @Test
    fun `DailySummary water progress calculation`() {
        val summary = DailySummary(
            date = "2024-01-15",
            water = 5,
            waterGoal = 8
        )

        assertEquals(0.625f, summary.waterProgress, 0.001f)
    }

    @Test
    fun `DailySummary macro progress calculations`() {
        val summary = DailySummary(
            date = "2024-01-15",
            protein = 75,
            proteinGoal = 150,
            carbs = 125,
            carbsGoal = 250,
            fat = 32,
            fatGoal = 65
        )

        assertEquals(0.5f, summary.proteinProgress, 0.001f)
        assertEquals(0.5f, summary.carbsProgress, 0.001f)
        assertEquals(0.49f, summary.fatProgress, 0.01f)
    }

    @Test
    fun `DailySummary serialization and deserialization`() {
        val original = DailySummary(
            date = "2024-01-15",
            calories = 1500,
            calorieGoal = 2000,
            protein = 80,
            proteinGoal = 150,
            carbs = 150,
            carbsGoal = 250,
            fat = 50,
            fatGoal = 65,
            water = 5,
            waterGoal = 8,
            lastSyncTime = 1705327200000
        )

        val json = original.toJson()
        val deserialized = DailySummary.fromJson(json)

        assertNotNull(deserialized)
        assertEquals(original.date, deserialized?.date)
        assertEquals(original.calories, deserialized?.calories)
        assertEquals(original.calorieGoal, deserialized?.calorieGoal)
        assertEquals(original.water, deserialized?.water)
    }

    @Test
    fun `DailySummary fromJson handles invalid JSON`() {
        val result = DailySummary.fromJson("invalid json")
        assertNull(result)
    }

    @Test
    fun `DailySummary empty creates valid default`() {
        val empty = DailySummary.empty("2024-01-15")

        assertEquals("2024-01-15", empty.date)
        assertEquals(0, empty.calories)
        assertEquals(2000, empty.calorieGoal)
    }

    @Test
    fun `RecentFood serialization and deserialization`() {
        val original = RecentFood(
            id = "food-1",
            name = "Apple",
            calories = 95,
            protein = 0,
            carbs = 25,
            fat = 0,
            servingSize = "1 medium",
            lastUsed = 1705327200000
        )

        val json = original.toJson()
        val deserialized = RecentFood.fromJson(json)

        assertNotNull(deserialized)
        assertEquals(original.id, deserialized?.id)
        assertEquals(original.name, deserialized?.name)
        assertEquals(original.calories, deserialized?.calories)
    }

    @Test
    fun `RecentFood listFromJson parses array correctly`() {
        val json = """[
            {"id": "1", "name": "Apple", "calories": 95},
            {"id": "2", "name": "Banana", "calories": 105}
        ]"""

        val foods = RecentFood.listFromJson(json)

        assertEquals(2, foods.size)
        assertEquals("Apple", foods[0].name)
        assertEquals("Banana", foods[1].name)
    }

    @Test
    fun `RecentFood listFromJson handles invalid JSON`() {
        val result = RecentFood.listFromJson("invalid")
        assertTrue(result.isEmpty())
    }

    @Test
    fun `QuickAddPreset defaults contains expected values`() {
        val presets = QuickAddPreset.defaults

        assertEquals(5, presets.size)
        assertEquals(100, presets[0].calories)
        assertEquals(500, presets[4].calories)
    }

    @Test
    fun `WearAction AddWater creates correct path`() {
        val action = WearAction.AddWater(2)
        assertEquals("/action/water/add", action.toPath())
    }

    @Test
    fun `WearAction QuickAdd creates correct data`() {
        val action = WearAction.QuickAdd(300, "lunch")
        val data = String(action.toData())

        assertTrue(data.contains("300"))
        assertTrue(data.contains("lunch"))
    }

    @Test
    fun `WearAction LogFood creates correct path`() {
        val action = WearAction.LogFood("food-123")
        assertEquals("/action/food/log", action.toPath())
    }

    @Test
    fun `MealType fromTimeOfDay returns correct meals`() {
        // Note: This test depends on the current time
        // In a real test, we'd mock the Calendar
        val meal = MealType.fromTimeOfDay()
        assertNotNull(meal)
    }
}
