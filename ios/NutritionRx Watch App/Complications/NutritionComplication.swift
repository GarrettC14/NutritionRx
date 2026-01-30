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
    let isFasting: Bool
    let fastingRemainingSeconds: Double
    let fastingProgress: Double
    let fastingProtocolName: String?

    static var placeholder: NutritionEntry {
        NutritionEntry(
            date: Date(),
            caloriesConsumed: 1200,
            calorieTarget: 2000,
            waterGlasses: 4,
            waterTarget: 8,
            isFasting: false,
            fastingRemainingSeconds: 0,
            fastingProgress: 0,
            fastingProtocolName: nil
        )
    }

    static var empty: NutritionEntry {
        NutritionEntry(
            date: Date(),
            caloriesConsumed: 0,
            calorieTarget: 2000,
            waterGlasses: 0,
            waterTarget: 8,
            isFasting: false,
            fastingRemainingSeconds: 0,
            fastingProgress: 0,
            fastingProtocolName: nil
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
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let defaults = UserDefaults(suiteName: "group.com.nutritionrx.app"),
              let data = defaults.data(forKey: "watchDailyData"),
              let dailyData = try? decoder.decode(WatchDailyData.self, from: data)
        else {
            return .empty
        }

        // Compute fasting values
        var isFasting = false
        var fastingRemaining: Double = 0
        var fastingProgress: Double = 0
        var fastingProtocolName: String? = nil

        if let fasting = dailyData.fasting, fasting.isEnabled, fasting.isFasting,
           let start = fasting.fastStartTime, let target = fasting.targetHours {
            isFasting = true
            let elapsed = Date().timeIntervalSince(start)
            let total = Double(target) * 3600
            fastingRemaining = max(0, total - elapsed)
            fastingProgress = min(elapsed / total, 1.0)
            fastingProtocolName = fasting.fastingProtocol?.name
        }

        return NutritionEntry(
            date: Date(),
            caloriesConsumed: dailyData.caloriesConsumed,
            calorieTarget: dailyData.calorieTarget,
            waterGlasses: dailyData.waterGlasses,
            waterTarget: dailyData.waterTarget,
            isFasting: isFasting,
            fastingRemainingSeconds: fastingRemaining,
            fastingProgress: fastingProgress,
            fastingProtocolName: fastingProtocolName
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
                waterTarget: entry.waterTarget,
                isFasting: entry.isFasting,
                fastingRemainingSeconds: entry.fastingRemainingSeconds
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
