import WidgetKit
import SwiftUI

struct NutritionRxWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodaySummaryWidget()
        WaterTrackingWidget()
        QuickAddWidget()
    }
}
