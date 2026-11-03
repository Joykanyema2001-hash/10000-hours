import SwiftUI
import WidgetKit

// The app writes this JSON to the shared App Group under "widget" (see src/lib/nativeSync.ts).
struct WidgetSkill: Codable, Hashable {
  let name: String
  let hours: Int
  let symbol: String
}

struct WidgetActive: Codable, Hashable {
  let skillName: String
  let symbol: String
  let startDate: Double // epoch ms the elapsed timer counts from
  let pausedElapsedMs: Double?
}

struct WidgetData: Codable {
  let dayStart: Double // epoch ms of the local midnight todayMs belongs to
  let todayMs: Double
  let goalMs: Double
  let skills: [WidgetSkill]
  let active: WidgetActive?

  static let appGroup = "group.com.joykanyema.tenthousandhours"

  static func load() -> WidgetData? {
    guard
      let json = UserDefaults(suiteName: appGroup)?.string(forKey: "widget"),
      let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: data)
  }

  static let sample = WidgetData(
    dayStart: Calendar.current.startOfDay(for: Date()).timeIntervalSince1970 * 1000,
    todayMs: 85 * 60_000,
    goalMs: 120 * 60_000,
    skills: [
      WidgetSkill(name: "Guitar", hours: 1240, symbol: "guitars"),
      WidgetSkill(name: "Coding", hours: 412, symbol: "chevron.left.forwardslash.chevron.right"),
      WidgetSkill(name: "Spanish", hours: 86, symbol: "character.bubble"),
    ],
    active: nil
  )
}

struct TodayEntry: TimelineEntry {
  let date: Date
  let data: WidgetData?

  /// Today's total, or 0 once the day the app saved it for has passed.
  var todayMs: Double {
    guard let d = data else { return 0 }
    let midnight = Calendar.current.startOfDay(for: date).timeIntervalSince1970 * 1000
    return abs(d.dayStart - midnight) < 60_000 ? d.todayMs : 0
  }

  var fraction: Double {
    guard let d = data, d.goalMs > 0 else { return 0 }
    return min(1, todayMs / d.goalMs)
  }
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), data: .sample)
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: Date(), data: context.isPreview ? .sample : (WidgetData.load() ?? .sample)))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let now = Date()
    let data = WidgetData.load()
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(24 * 3600 + 5)
    // A second entry just after midnight resets "today" even if the app isn't opened.
    let entries = [TodayEntry(date: now, data: data), TodayEntry(date: midnight, data: data)]
    completion(Timeline(entries: entries, policy: .after(midnight)))
  }
}

struct GoalRing: View {
  let fraction: Double
  let line: CGFloat

  var body: some View {
    ZStack {
      Circle().stroke(Color.tenkInk.opacity(0.15), lineWidth: line)
      Circle()
        .trim(from: 0, to: max(0.001, fraction))
        .stroke(Color.tenkInk, style: StrokeStyle(lineWidth: line, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
  }
}

struct ActiveLine: View {
  let active: WidgetActive

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: active.pausedElapsedMs == nil ? "record.circle" : "pause.circle.fill")
        .font(.system(size: 11, weight: .bold))
      Text(active.skillName).font(rounded(12, .semibold)).lineLimit(1)
      Spacer(minLength: 2)
      if let paused = active.pausedElapsedMs {
        Text(formatClock(seconds: paused / 1000)).font(rounded(12)).monospacedDigit()
      } else {
        Text(timerInterval: Date(timeIntervalSince1970: active.startDate / 1000)...Date.distantFuture, countsDown: false)
          .font(rounded(12))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 64, alignment: .trailing)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
    .background(Color.tenkInk)
    .foregroundColor(.tenkLime)
    .clipShape(Capsule())
  }
}

struct TodaySmallView: View {
  let entry: TodayEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("TODAY").font(rounded(11, .heavy)).opacity(0.7)
        Spacer()
        GoalRing(fraction: entry.fraction, line: 5).frame(width: 22, height: 22)
      }
      Text(formatDuration(ms: entry.todayMs))
        .font(rounded(30, .heavy))
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Spacer(minLength: 0)
      if let active = entry.data?.active {
        ActiveLine(active: active)
      } else if let goal = entry.data?.goalMs {
        let left = goal - entry.todayMs
        Text(left > 0 ? "\(formatDuration(ms: left)) to goal" : "Goal done")
          .font(rounded(13, .semibold))
          .opacity(0.75)
      }
    }
    .foregroundColor(.tenkInk)
  }
}

struct TodayMediumView: View {
  let entry: TodayEntry

  var body: some View {
    HStack(spacing: 16) {
      ZStack {
        GoalRing(fraction: entry.fraction, line: 10)
        VStack(spacing: 0) {
          Text(formatDuration(ms: entry.todayMs)).font(rounded(18, .heavy)).minimumScaleFactor(0.6).lineLimit(1)
          Text("today").font(rounded(11, .semibold)).opacity(0.7)
        }
        .padding(12)
      }
      .frame(width: 112, height: 112)

      VStack(alignment: .leading, spacing: 7) {
        if let active = entry.data?.active {
          ActiveLine(active: active)
        }
        ForEach((entry.data?.skills ?? []).prefix(entry.data?.active == nil ? 3 : 2), id: \.self) { skill in
          HStack(spacing: 8) {
            Image(systemName: skill.symbol)
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.tenkLime)
              .frame(width: 24, height: 24)
              .background(Color.tenkInk)
              .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            Text(skill.name).font(rounded(14, .semibold)).lineLimit(1)
            Spacer(minLength: 4)
            Text("\(skill.hours.formatted()) h").font(rounded(14, .heavy))
          }
        }
        if entry.data == nil {
          Text("Open 10,000 Hours to start counting").font(rounded(13, .semibold))
        }
      }
    }
    .foregroundColor(.tenkInk)
  }
}

struct TodayAccessoryCircular: View {
  let entry: TodayEntry
  var body: some View {
    Gauge(value: entry.fraction) {
      Image(systemName: "clock.fill")
    } currentValueLabel: {
      Text("\(Int(entry.fraction * 100))%").font(rounded(12))
    }
    .gaugeStyle(.accessoryCircular)
  }
}

struct TodayAccessoryRectangular: View {
  let entry: TodayEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("10,000 Hours").font(rounded(12, .semibold))
      Text("\(formatDuration(ms: entry.todayMs)) today").font(rounded(16, .heavy))
      if let top = entry.data?.skills.first {
        Text("\(top.name) · \(top.hours.formatted()) h").font(rounded(12, .medium)).lineLimit(1)
      }
    }
  }
}

struct TodayWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TodayEntry

  var body: some View {
    switch family {
    case .accessoryCircular:
      TodayAccessoryCircular(entry: entry).tenkWidgetBackground(.clear)
    case .accessoryRectangular:
      TodayAccessoryRectangular(entry: entry).tenkWidgetBackground(.clear)
    case .systemMedium:
      TodayMediumView(entry: entry).tenkWidgetBackground(.tenkLime).widgetURL(URL(string: "tenk://"))
    default:
      TodaySmallView(entry: entry).tenkWidgetBackground(.tenkLime).widgetURL(URL(string: "tenk://"))
    }
  }
}

struct TodayWidget: Widget {
  let kind = "TodayWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName("Today")
    .description("Today's practice, your goal and your skills.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}
