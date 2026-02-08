import WidgetKit
import SwiftUI

struct QuickAddEntry: TimelineEntry {
    let date: Date
}

struct QuickAddProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickAddEntry {
        QuickAddEntry(date: Date())
    }
    func getSnapshot(in context: Context, completion: @escaping (QuickAddEntry) -> Void) {
        completion(QuickAddEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAddEntry>) -> Void) {
        let entry = QuickAddEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct QuickAddWidgetView: View {
    let entry: QuickAddEntry
    var body: some View {
        VStack {
            Image(systemName: "plus.circle.fill").font(.largeTitle)
            Text("Quick Add").font(.caption)
        }
    }
}

struct QuickAddWidget: Widget {
    let kind = "QuickAddWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickAddProvider()) { entry in
            QuickAddWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Add")
        .description("Quickly log food.")
        .supportedFamilies([.systemSmall])
    }
}
