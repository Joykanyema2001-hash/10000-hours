import SwiftUI
import WidgetKit

@main
struct TenKWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    SessionLiveActivity()
  }
}
