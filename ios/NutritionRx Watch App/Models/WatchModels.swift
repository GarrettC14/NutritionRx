/**
 * Watch Data Models
 * Data structures for Apple Watch companion app
 */

import Foundation

// MARK: - Fasting

/// Fasting protocol configuration
struct WatchFastingProtocol: Codable, Equatable {
    let id: String
    let name: String
    let fastingHours: Int
    let eatingHours: Int
}

/// Current fasting state synced from phone
struct FastingState: Codable, Equatable {
    let isEnabled: Bool
    let isFasting: Bool
    let fastingProtocol: WatchFastingProtocol?
    let fastStartTime: Date?
    let targetHours: Int?
    let eatingWindowStart: String?
    let eatingWindowEnd: String?
    let currentStreak: Int
}

// MARK: - Daily Data

/// Main data structure synced from phone to watch
struct WatchDailyData: Codable, Equatable {
    let date: Date
    var caloriesConsumed: Int
    var calorieTarget: Int
    var waterGlasses: Int
    var waterTarget: Int
    var protein: Int
    var carbs: Int
    var fat: Int
    var recentFoods: [SimpleFood]
    var favoriteFoods: [SimpleFood]
    var fasting: FastingState?

    static let empty = WatchDailyData(
        date: Date(),
        caloriesConsumed: 0,
        calorieTarget: 2000,
        waterGlasses: 0,
        waterTarget: 8,
        protein: 0,
        carbs: 0,
        fat: 0,
        recentFoods: [],
        favoriteFoods: [],
        fasting: nil
    )

    /// Check if this data is for today
    var isForToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    /// Remaining calories (can be negative when over)
    var remainingCalories: Int {
        calorieTarget - caloriesConsumed
    }

    /// Progress towards calorie goal (0.0 - 1.0, capped at 1.0)
    var calorieProgress: Double {
        guard calorieTarget > 0 else { return 0 }
        return min(Double(caloriesConsumed) / Double(calorieTarget), 1.0)
    }

    /// Progress towards water goal (0.0 - 1.0, capped at 1.0)
    var waterProgress: Double {
        guard waterTarget > 0 else { return 0 }
        return min(Double(waterGlasses) / Double(waterTarget), 1.0)
    }

    /// Check if calorie goal is met
    var hasMetCalorieGoal: Bool {
        caloriesConsumed >= calorieTarget
    }

    /// Check if water goal is met
    var hasMetWaterGoal: Bool {
        waterGlasses >= waterTarget
    }
}

// MARK: - Simple Food

/// Simplified food item for watch display
struct SimpleFood: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let calories: Int
    let protein: Int?
    let carbs: Int?
    let fat: Int?

    /// Display name truncated for watch
    var displayName: String {
        if name.count > 25 {
            return String(name.prefix(22)) + "..."
        }
        return name
    }
}

// MARK: - Meal Type

/// Meal categories with time-based auto-detection
enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"

    /// Auto-detect meal type based on current time
    static func forCurrentTime() -> MealType {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<10: return .breakfast
        case 10..<14: return .lunch
        case 14..<17: return .snack
        case 17..<21: return .dinner
        default: return .snack
        }
    }

    /// Icon for meal type
    var icon: String {
        switch self {
        case .breakfast: return "sunrise"
        case .lunch: return "sun.max"
        case .dinner: return "moon"
        case .snack: return "leaf"
        }
    }
}

// MARK: - Commands (Watch -> Phone)

/// Commands sent from watch to phone
enum NutritionWatchCommand: Codable {
    case addWater(glasses: Int)
    case removeWater(glasses: Int)
    case quickAddCalories(calories: Int, meal: MealType)
    case logFood(foodId: String, meal: MealType)
    case requestSync

    /// Encode to dictionary for WatchConnectivity
    func toDictionary() -> [String: Any] {
        switch self {
        case .addWater(let glasses):
            return ["type": "addWater", "glasses": glasses]
        case .removeWater(let glasses):
            return ["type": "removeWater", "glasses": glasses]
        case .quickAddCalories(let calories, let meal):
            return ["type": "quickAddCalories", "calories": calories, "meal": meal.rawValue]
        case .logFood(let foodId, let meal):
            return ["type": "logFood", "foodId": foodId, "meal": meal.rawValue]
        case .requestSync:
            return ["type": "requestSync"]
        }
    }
}

// MARK: - Quick Add Preset

/// Preset calorie amounts for quick add
struct QuickAddPreset: Identifiable {
    let id = UUID()
    let calories: Int
    let label: String
    let description: String

    static let presets: [QuickAddPreset] = [
        QuickAddPreset(calories: 200, label: "200 cal", description: "Light snack"),
        QuickAddPreset(calories: 400, label: "400 cal", description: "Medium meal"),
        QuickAddPreset(calories: 600, label: "600 cal", description: "Large meal")
    ]
}
