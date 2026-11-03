import ActivityKit
import SwiftUI
import WidgetKit

/// Elapsed time. While running, iOS draws the count-up itself, so it stays live
/// with the app closed. While paused it's a fixed value.
struct ElapsedText: View {
  let state: SessionActivityAttributes.ContentState
  let size: CGFloat

  var body: some View {
    Group {
      if let paused = state.pausedElapsed {
        Text(formatClock(seconds: paused))
      } else {
        Text(timerInterval: state.startDate...Date.distantFuture, countsDown: false)
      }
    }
    .font(rounded(size))
    .monospacedDigit()
    .multilineTextAlignment(.trailing)
  }
}

/// Bar that fills toward the next whole hour on its own while running.
struct HourProgress: View {
  let state: SessionActivityAttributes.ContentState
  let tint: Color

  var body: some View {
    Group {
      if let paused = state.pausedElapsed {
        let total = state.hourEnd.timeIntervalSince(state.hourStart)
        let done = state.startDate.addingTimeInterval(paused).timeIntervalSince(state.hourStart)
        ProgressView(value: max(0, min(1, total > 0 ? done / total : 0)))
      } else {
        ProgressView(timerInterval: state.hourStart...state.hourEnd, countsDown: false, label: { EmptyView() }, currentValueLabel: { EmptyView() })
      }
    }
    .progressViewStyle(.linear)
    .tint(tint)
  }
}

struct SessionLockScreenView: View {
  let state: SessionActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        Image(systemName: state.symbol)
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(.tenkLime)
          .frame(width: 40, height: 40)
          .background(Color.tenkInk)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        VStack(alignment: .leading, spacing: 1) {
          Text(state.skillName).font(rounded(18)).lineLimit(1)
          Text(state.pausedElapsed == nil ? "In session" : "Paused")
            .font(rounded(13, .medium))
            .opacity(0.7)
        }
        Spacer(minLength: 8)
        ElapsedText(state: state, size: 34)
          .frame(maxWidth: 140, alignment: .trailing)
      }
      VStack(alignment: .leading, spacing: 4) {
        HourProgress(state: state, tint: .tenkInk)
        Text("Working toward hour \(state.nextHour.formatted())")
          .font(rounded(12, .semibold))
          .opacity(0.75)
      }
    }
    .padding(16)
    .foregroundColor(.tenkInk)
  }
}

struct SessionLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SessionActivityAttributes.self) { context in
      SessionLockScreenView(state: context.state)
        .activityBackgroundTint(.tenkLime)
        .activitySystemActionForegroundColor(.tenkInk)
        .widgetURL(URL(string: "tenk://timer"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            Image(systemName: context.state.symbol)
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(.tenkInk)
              .frame(width: 32, height: 32)
              .background(Color.tenkLime)
              .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            Text(context.state.skillName)
              .font(rounded(16))
              .foregroundColor(.white)
              .lineLimit(1)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ElapsedText(state: context.state, size: 26)
            .foregroundColor(.tenkLime)
            .frame(maxWidth: 110, alignment: .trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 4) {
            HourProgress(state: context.state, tint: .tenkLime)
            Text(context.state.pausedElapsed == nil ? "Hour \(context.state.nextHour.formatted()) is on its way" : "Paused")
              .font(rounded(12, .semibold))
              .foregroundColor(.white.opacity(0.7))
          }
          .padding(.horizontal, 4)
          .padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: context.state.symbol)
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.tenkLime)
      } compactTrailing: {
        ElapsedText(state: context.state, size: 14)
          .foregroundColor(.tenkLime)
          .frame(maxWidth: 58)
      } minimal: {
        Image(systemName: context.state.pausedElapsed == nil ? "clock.fill" : "pause.fill")
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(.tenkLime)
      }
      .widgetURL(URL(string: "tenk://timer"))
      .keylineTint(.tenkLime)
    }
  }
}
