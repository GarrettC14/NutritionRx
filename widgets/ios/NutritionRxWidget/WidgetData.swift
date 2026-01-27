import Foundation

// MARK: - Shared Constants

struct WidgetConstants {
    static let appGroupIdentifier = "group.com.nutritionrx.app"
    static let sharedDefaultsKey = "widget_data"

    // Update intervals
    static let updateIntervalMinutes = 15
}

// MARK: - Widget Data Models

struct NutritionData: Codable {
    let caloriesConsumed: Int
    let caloriesGoal: Int
    let proteinConsumed: Double
    let proteinGoal: Double
    let carbsConsumed: Double
    let carbsGoal: Double
    let fatConsumed: Double
    let fatGoal: Double
    let lastUpdated: Date

    var caloriesRemaining: Int {
        return max(0, caloriesGoal - caloriesConsumed)
    }

    var caloriesProgress: Double {
        guard caloriesGoal > 0 else { return 0 }
        return min(1.0, Double(caloriesConsumed) / Double(caloriesGoal))
    }

    static var placeholder: NutritionData {
        NutritionData(
            caloriesConsumed: 1200,
            caloriesGoal: 2000,
            proteinConsumed: 80,
            proteinGoal: 150,
            carbsConsumed: 150,
            carbsGoal: 250,
            fatConsumed: 40,
            fatGoal: 65,
            lastUpdated: Date()
        )
    }
}

struct WaterData: Codable {
    let glassesConsumed: Int
    let glassesGoal: Int
    let glassSizeMl: Int
    let lastUpdated: Date

    var progress: Double {
        guard glassesGoal > 0 else { return 0 }
        return min(1.0, Double(glassesConsumed) / Double(glassesGoal))
    }

    var glassesRemaining: Int {
        return max(0, glassesGoal - glassesConsumed)
    }

    var consumedMl: Int {
        return glassesConsumed * glassSizeMl
    }

    var goalMl: Int {
        return glassesGoal * glassSizeMl
    }

    static var placeholder: WaterData {
        WaterData(
            glassesConsumed: 4,
            glassesGoal: 8,
            glassSizeMl: 250,
            lastUpdated: Date()
        )
    }
}

struct WidgetDataContainer: Codable {
    let nutrition: NutritionData
    let water: WaterData
    let date: String // YYYY-MM-DD format

    static var placeholder: WidgetDataContainer {
        WidgetDataContainer(
            nutrition: .placeholder,
            water: .placeholder,
            date: ISO8601DateFormatter().string(from: Date()).prefix(10).description
        )
    }
}

// MARK: - Data Provider

class WidgetDataProvider {
    static let shared = WidgetDataProvider()

    private let sharedDefaults: UserDefaults?
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        sharedDefaults = UserDefaults(suiteName: WidgetConstants.appGroupIdentifier)
    }

    func loadData() -> WidgetDataContainer? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: WidgetConstants.sharedDefaultsKey) else {
            return nil
        }

        do {
            let container = try decoder.decode(WidgetDataContainer.self, from: data)
            return container
        } catch {
            print("Failed to decode widget data: \(error)")
            return nil
        }
    }

    func saveData(_ container: WidgetDataContainer) {
        guard let defaults = sharedDefaults else { return }

        do {
            let data = try encoder.encode(container)
            defaults.set(data, forKey: WidgetConstants.sharedDefaultsKey)
        } catch {
            print("Failed to encode widget data: \(error)")
        }
    }

    func getCurrentData() -> WidgetDataContainer {
        return loadData() ?? .placeholder
    }
}
