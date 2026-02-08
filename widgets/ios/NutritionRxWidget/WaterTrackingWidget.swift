import WidgetKit
import SwiftUI

struct WaterTrackingEntry: TimelineEntry {
    let date: Date
    let glasses: Int
    let goal: Int
}

struct WaterTrackingProvider: TimelineProvider {
    func placeholder(in context: Context) -> WaterTrackingEntry {
        WaterTrackingEntry(date: Date(), glasses: 0, goal: 8)
    }
    func getSnapshot(in context: Context, completion: @escaping (WaterTrackingEntry) -> Void) {
        completion(WaterTrackingEntry(date: Date(), glasses: 0, goal: 8))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WaterTrackingEntry>) -> Void) {
        let entry = WaterTrackingEntry(date: Date(), glasses: 0, goal: 8)
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800)))
        completion(timeline)
    }
}

struct WaterTrackingWidgetView: View {
    let entry: WaterTrackingEntry
    var body: some View {
        VStack {
            Text("Water").font(.headline)
            Text("\(entry.glasses) / \(entry.goal)").font(.caption)
        }
    }
}

struct WaterTrackingWidget: Widget {
    let kind = "WaterTrackingWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WaterTrackingProvider()) { entry in
            WaterTrackingWidgetView(entry: entry)
        }
        .configurationDisplayName("Water Tracking")
        .description("Track your daily water intake.")
        .supportedFamilies([.systemSmall])
    }
}
