import WidgetKit
import SwiftUI

struct TodaySummaryEntry: TimelineEntry {
    let date: Date
    let calories: Int
    let calorieGoal: Int
}

struct TodaySummaryProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodaySummaryEntry {
        TodaySummaryEntry(date: Date(), calories: 0, calorieGoal: 2000)
    }
    func getSnapshot(in context: Context, completion: @escaping (TodaySummaryEntry) -> Void) {
        completion(TodaySummaryEntry(date: Date(), calories: 0, calorieGoal: 2000))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodaySummaryEntry>) -> Void) {
        let entry = TodaySummaryEntry(date: Date(), calories: 0, calorieGoal: 2000)
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800)))
        completion(timeline)
    }
}

struct TodaySummaryWidgetView: View {
    let entry: TodaySummaryEntry
    var body: some View {
        VStack {
            Text("Today").font(.headline)
            Text("\(entry.calories) / \(entry.calorieGoal) cal").font(.caption)
        }
    }
}

struct TodaySummaryWidget: Widget {
    let kind = "TodaySummaryWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodaySummaryProvider()) { entry in
            TodaySummaryWidgetView(entry: entry)
        }
        .configurationDisplayName("Today Summary")
        .description("View your daily calorie summary.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
