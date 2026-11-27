import ActivityKit
import SwiftUI
import WidgetKit

private let activityYellow = Color(red: 1, green: 0.82, blue: 0)

struct FestivalLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FestivalActivityAttributes.self) { context in
      HStack(alignment: .center, spacing: 16) {
        VStack(alignment: .leading, spacing: 6) {
          Text(ended(context) ? "СОБЫТИЕ ЗАВЕРШЕНО" : (context.state.kind ?? context.attributes.kind) == "autograph" ? "ТВОЯ АВТОГРАФ-СЕССИЯ" : "ТВОЁ ВЫСТУПЛЕНИЕ")
            .font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(activityYellow)
          Text(context.state.artist ?? context.attributes.artist).font(.system(size: 24, weight: .black)).foregroundStyle(.white).lineLimit(2)
          Text("\(context.state.stage ?? context.attributes.stage) · \(context.state.timeLabel ?? context.attributes.timeLabel)")
            .font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.75)).lineLimit(2)
          HStack(spacing: 18) {
            Link(destination: eventURL(context)) { Label("Расписание", systemImage: "calendar") }
            Link(destination: URL(string: "uletay://map")!) { Label("Карта", systemImage: "map") }
          }.font(.system(size: 12, weight: .semibold)).foregroundStyle(activityYellow).padding(.top, 4)
        }
        Spacer(minLength: 0)
        VStack(spacing: 5) {
          Image(systemName: ended(context) ? "checkmark.circle.fill" : "music.mic").font(.system(size: 28)).foregroundStyle(activityYellow)
          if !ended(context) {
            Text(timerInterval: timerRange(context), countsDown: true)
              .font(.system(size: 18, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(activityYellow).frame(width: 84)
            Text(context.state.status == "upcoming" ? "до начала" : "до окончания").font(.system(size: 9)).foregroundStyle(.white.opacity(0.65))
          }
        }
      }.padding(18)
        .activityBackgroundTint(Color(red: 0.15, green: 0.04, blue: 0.11))
        .activitySystemActionForegroundColor(activityYellow)
        .widgetURL(eventURL(context))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "music.mic").foregroundStyle(activityYellow).padding(.top, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(alignment: .leading, spacing: 3) {
            Text(context.state.artist ?? context.attributes.artist).font(.headline).lineLimit(1)
            Text(context.state.stage ?? context.attributes.stage).font(.caption).foregroundStyle(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text(ended(context) ? "Событие завершено" : context.state.timeLabel ?? context.attributes.timeLabel).font(.caption)
            Spacer()
            Link("Карта →", destination: URL(string: "uletay://map")!).foregroundStyle(activityYellow)
          }
        }
      } compactLeading: {
        Image(systemName: "music.mic").foregroundStyle(activityYellow)
      } compactTrailing: {
        if ended(context) { Image(systemName: "checkmark").foregroundStyle(activityYellow) }
        else {
          Text(timerInterval: timerRange(context), countsDown: true)
            .monospacedDigit().frame(width: 52).foregroundStyle(activityYellow)
        }
      } minimal: {
        Image(systemName: "music.mic").foregroundStyle(activityYellow)
      }.widgetURL(eventURL(context)).keylineTint(activityYellow)
    }
  }

  private func ended(_ context: ActivityViewContext<FestivalActivityAttributes>) -> Bool {
    context.isStale || context.state.status == "ended"
  }
  private func timerRange(_ context: ActivityViewContext<FestivalActivityAttributes>) -> ClosedRange<Date> {
    let start = context.state.startAt ?? context.attributes.startAt
    let end = context.state.status == "upcoming" ? start : context.state.endAt
    return min(start.addingTimeInterval(-600), end)...end
  }
  private func eventURL(_ context: ActivityViewContext<FestivalActivityAttributes>) -> URL {
    let path = context.state.url ?? context.attributes.url
    return URL(string: "uletay://" + path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))) ?? URL(string: "uletay://favorites")!
  }
}
