/**
 * NutritionComplication
 * WidgetKit complication for Apple Watch
 */

import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct NutritionEntry: TimelineEntry {
    let date: Date
    let caloriesConsumed: Int
    let calorieTarget: Int
    let waterGlasses: Int
    let waterTarget: Int

    static var placeholder: NutritionEntry {
        NutritionEntry(
            date: Date(),
            caloriesConsumed: 1200,
            calorieTarget: 2000,
            waterGlasses: 4,
            waterTarget: 8
        )
    }

    static var empty: NutritionEntry {
        NutritionEntry(
            date: Date(),
            caloriesConsumed: 0,
            calorieTarget: 2000,
            waterGlasses: 0,
            waterTarget: 8
        )
    }
}

// MARK: - Timeline Provider

struct NutritionTimelineProvider: TimelineProvider {
    typealias Entry = NutritionEntry

    func placeholder(in context: Context) -> NutritionEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (NutritionEntry) -> Void) {
        // Load from shared data
        let entry = loadCurrentEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NutritionEntry>) -> Void) {
        let entry = loadCurrentEntry()

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadCurrentEntry() -> NutritionEntry {
        // Load from App Group shared container
        guard let defaults = UserDefaults(suiteName: "group.com.nutritionrx.app"),
              let data = defaults.data(forKey: "watchDailyData"),
              let dailyData = try? JSONDecoder().decode(WatchDailyData.self, from: data)
        else {
            return .empty
        }

        return NutritionEntry(
            date: Date(),
            caloriesConsumed: dailyData.caloriesConsumed,
            calorieTarget: dailyData.calorieTarget,
            waterGlasses: dailyData.waterGlasses,
            waterTarget: dailyData.waterTarget
        )
    }
}

// MARK: - Complication Views by Family

struct NutritionComplicationEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: NutritionEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularComplicationView(
                caloriesConsumed: entry.caloriesConsumed,
                calorieTarget: entry.calorieTarget
            )
        case .accessoryRectangular:
            RectangularComplicationView(
                caloriesConsumed: entry.caloriesConsumed,
                calorieTarget: entry.calorieTarget,
                waterGlasses: entry.waterGlasses,
                waterTarget: entry.waterTarget
            )
        case .accessoryCorner:
            CornerComplicationView(
                caloriesConsumed: entry.caloriesConsumed,
                calorieTarget: entry.calorieTarget
            )
        case .accessoryInline:
            InlineComplicationView(
                caloriesConsumed: entry.caloriesConsumed,
                calorieTarget: entry.calorieTarget,
                waterGlasses: entry.waterGlasses
            )
        @unknown default:
            CircularComplicationView(
                caloriesConsumed: entry.caloriesConsumed,
                calorieTarget: entry.calorieTarget
            )
        }
    }
}

// MARK: - Widget Configuration

struct NutritionComplication: Widget {
    let kind: String = "NutritionComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NutritionTimelineProvider()) { entry in
            NutritionComplicationEntryView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Nutrition")
        .description("Track your daily calories and water intake")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryCorner,
            .accessoryInline
        ])
    }
}

// MARK: - Preview

#Preview(as: .accessoryCircular) {
    NutritionComplication()
} timeline: {
    NutritionEntry.placeholder
}

#Preview(as: .accessoryRectangular) {
    NutritionComplication()
} timeline: {
    NutritionEntry.placeholder
}
