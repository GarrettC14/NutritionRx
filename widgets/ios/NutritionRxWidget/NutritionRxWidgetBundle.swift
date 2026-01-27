import WidgetKit
import SwiftUI

@main
struct NutritionRxWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodaySummaryWidget()
        WaterTrackingWidget()
        QuickAddWidget()
    }
}
