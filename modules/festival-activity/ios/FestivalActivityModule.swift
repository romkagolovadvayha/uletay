import ActivityKit
import ExpoModulesCore
import UIKit

private struct FestivalEvent: Decodable {
  let id: String
  let artist: String
  let stage: String
  let kind: String
  let startAt: Double
  let endAt: Double
  let timeLabel: String
  let url: String
  var attributes: FestivalActivityAttributes {
    FestivalActivityAttributes(eventId: id, artist: artist, stage: stage, kind: kind,
      startAt: Date(timeIntervalSince1970: startAt / 1000), endAt: Date(timeIntervalSince1970: endAt / 1000),
      timeLabel: timeLabel, url: url)
  }
  var content: FestivalActivityContentState {
    FestivalActivityContentState(endAt: attributes.endAt, artist: artist, stage: stage, kind: kind,
      startAt: attributes.startAt, timeLabel: timeLabel, url: url,
      status: Date() >= attributes.endAt ? "ended" : Date() >= attributes.startAt ? "live" : "upcoming")
  }
}
private struct FestivalSnapshot: Decodable {
  let events: [FestivalEvent]
  let enabled: Bool
  let favoriteKeys: [String]
  let authoritative: Bool
}

public class FestivalActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FestivalActivity")
    OnCreate { Task { await FestivalActivityPush.shared.restore() } }
    OnAppBecomesActive { Task { await FestivalActivityPush.shared.restore() } }
    AsyncFunction("configurePush") { (url: String, enabled: Bool) async in
      await FestivalActivityPush.shared.configure(url, enabled: enabled)
    }
    AsyncFunction("syncEvents") { (json: String) async throws in
      let events = try JSONDecoder().decode([FestivalEvent].self, from: Data(json.utf8))
      await FestivalActivityController.shared.sync(FestivalSnapshot(events: events, enabled: !events.isEmpty, favoriteKeys: events.map(\.id), authoritative: true))
    }
    AsyncFunction("syncState") { (json: String) async throws in
      await FestivalActivityController.shared.sync(try JSONDecoder().decode(FestivalSnapshot.self, from: Data(json.utf8)))
    }
  }
}

private actor FestivalActivityController {
  static let shared = FestivalActivityController()
  // Serialize with JS and retain the signature so a dismissed activity stays dismissed.
  private var lastRequested: String? = UserDefaults.standard.string(forKey: "uletay.activity.lastRequested")
  private var lastRequestedEvent: String? = UserDefaults.standard.string(forKey: "uletay.activity.lastEvent")

  func sync(_ snapshot: FestivalSnapshot) async {
    let now = Date()
    let active = snapshot.events.filter { $0.endAt / 1000 > now.timeIntervalSince1970 }
      .sorted { lhs, rhs in
        let lhsLive = lhs.startAt / 1000 <= now.timeIntervalSince1970
        let rhsLive = rhs.startAt / 1000 <= now.timeIntervalSince1970
        return lhsLive != rhsLive ? lhsLive : lhs.startAt < rhs.startAt
      }.first
    let desired = active?.attributes
    let existing = Activity<FestivalActivityAttributes>.activities
    let selected = Set(snapshot.favoriteKeys)
    if let lastRequestedEvent, !selected.contains(lastRequestedEvent) {
      self.lastRequestedEvent = nil
      UserDefaults.standard.removeObject(forKey: "uletay.activity.lastEvent")
    }
    // A cached timetable must not undo a newer APNs postponement on resume.
    if snapshot.enabled && !snapshot.authoritative && ActivityAuthorizationInfo().areActivitiesEnabled,
       existing.contains(where: { selected.contains($0.attributes.eventId) && $0.content.state.endAt > now && $0.activityState != .ended && $0.activityState != .dismissed }) {
      await FestivalActivityPush.shared.observeCurrentActivities(); await FestivalActivityPush.shared.flush(); return
    }
    for activity in existing {
      if !snapshot.enabled || desired == nil || !selected.contains(activity.attributes.eventId) || activity.attributes.eventId != desired?.eventId ||
          !ActivityAuthorizationInfo().areActivitiesEnabled {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
    guard snapshot.enabled, let attributes = desired, ActivityAuthorizationInfo().areActivitiesEnabled else {
      lastRequested = nil
      UserDefaults.standard.removeObject(forKey: "uletay.activity.lastRequested")
      return
    }
    let signature = "\(attributes.eventId):\(attributes.startAt.timeIntervalSince1970):\(attributes.endAt.timeIntervalSince1970):\(attributes.artist):\(attributes.stage)"
    guard let event = active else { return }
    let content = ActivityContent(state: event.content, staleDate: attributes.endAt)
    let remaining = Activity<FestivalActivityAttributes>.activities.first {
      $0.attributes.eventId == attributes.eventId && $0.activityState != .ended && $0.activityState != .dismissed
    }
    if let remaining {
      // Upgrade a pre-APNs local activity once, while keeping old builds usable.
      let foreground = await MainActor.run { UIApplication.shared.applicationState == .active }
      if remaining.content.state.status == nil && foreground {
        await remaining.end(nil, dismissalPolicy: .immediate); lastRequested = nil
        lastRequestedEvent = nil
      } else {
        if snapshot.authoritative { await remaining.update(content) }
        lastRequested = signature
        lastRequestedEvent = attributes.eventId
        UserDefaults.standard.set(signature, forKey: "uletay.activity.lastRequested")
        UserDefaults.standard.set(attributes.eventId, forKey: "uletay.activity.lastEvent")
        await FestivalActivityPush.shared.observeCurrentActivities(); await FestivalActivityPush.shared.flush(); return
      }
    }
    guard lastRequested != signature else { return }
    guard lastRequestedEvent != attributes.eventId else { return }
    // Recheck after all awaited work, immediately before the foreground-only API.
    guard await MainActor.run(body: { UIApplication.shared.applicationState == .active }) else { return }
    let leadAt = attributes.startAt.addingTimeInterval(-600)
    do {
      if leadAt <= now {
        _ = try Activity.request(attributes: attributes, content: content, pushType: .token)
        lastRequested = signature
        lastRequestedEvent = attributes.eventId
        UserDefaults.standard.set(attributes.eventId, forKey: "uletay.activity.lastEvent")
        UserDefaults.standard.set(signature, forKey: "uletay.activity.lastRequested")
      } else {
        // iOS 26 starts the next favorite locally, even while the app is closed.
        // Earlier iOS versions start when the app next enters the imminent window.
        #if compiler(>=6.2)
        if #available(iOS 26.0, *), leadAt.timeIntervalSince(now) <= 24 * 3600 {
          _ = try Activity.request(attributes: attributes, content: content, pushType: .token, style: .standard,
            alertConfiguration: AlertConfiguration(title: "Скоро избранное выступление", body: "Открой расписание Улетая", sound: .default), start: leadAt)
          lastRequested = signature
          lastRequestedEvent = attributes.eventId
          UserDefaults.standard.set(attributes.eventId, forKey: "uletay.activity.lastEvent")
          UserDefaults.standard.set(signature, forKey: "uletay.activity.lastRequested")
        }
        #endif
      }
      await FestivalActivityPush.shared.observeCurrentActivities(); await FestivalActivityPush.shared.flush()
    } catch {
      // Retry on the next foreground sync if the OS could not start the activity.
      lastRequested = nil
    }
  }
}
