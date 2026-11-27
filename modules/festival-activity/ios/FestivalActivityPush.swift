import ActivityKit
import CryptoKit
import ExpoModulesCore
import Foundation
import Security
import UIKit

private struct FestivalInstallation: Codable {
  let id: String
  let secret: String
  static func load() throws -> FestivalInstallation {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "ru.uletay.app.live-activity", kSecAttrAccount as String: "installation"]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query.merging([kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]) { _, b in b } as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data { return try JSONDecoder().decode(Self.self, from: data) }
    guard status == errSecItemNotFound else { throw NSError(domain: "FestivalActivity.Keychain", code: Int(status)) }
    var bytes = [UInt8](repeating: 0, count: 32)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw NSError(domain: "FestivalActivity.Random", code: 1) }
    let identity = Self(id: UUID().uuidString.lowercased(), secret: bytes.map { String(format: "%02x", $0) }.joined())
    let saved = query.merging([kSecValueData as String: try JSONEncoder().encode(identity),
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]) { _, b in b }
    let added = SecItemAdd(saved as CFDictionary, nil)
    guard added == errSecSuccess else { throw NSError(domain: "FestivalActivity.Keychain", code: Int(added)) }
    return identity
  }
}

actor FestivalActivityPush {
  static let shared = FestivalActivityPush()
  private var observers: [String: Task<Void, Never>] = [:]
  private var stateObservers: [String: Task<Void, Never>] = [:]
  private var endpoint: URL?
  private var enabled = false
  private var sending = false
  private var revision = UserDefaults.standard.integer(forKey: "uletay.activity.pushRevision")
  private var acknowledged = UserDefaults.standard.string(forKey: "uletay.activity.pushAck")
  private var retryAfter = Date.distantPast
  private var identity: FestivalInstallation?

  func configure(_ baseURL: String, enabled: Bool) {
    guard let url = URL(string: baseURL), url.user == nil, url.password == nil,
      url.query == nil, url.fragment == nil, url.path == "/api" else { return }
    let production = url.scheme == "https" && url.host == "uletayapp.ru" && url.port == nil
    #if DEBUG
    let local = url.scheme == "http" && ["localhost", "127.0.0.1", "::1"].contains(url.host ?? "")
    #else
    let local = false
    #endif
    guard production || local else { return }
    endpoint = url.appendingPathComponent("live-activities")
    self.enabled = enabled
    UserDefaults.standard.set(baseURL, forKey: "uletay.activity.pushURL")
    UserDefaults.standard.set(enabled, forKey: "uletay.activity.pushEnabled")
    observeCurrentActivities()
    flush()
  }

  func restore() {
    if let url = UserDefaults.standard.string(forKey: "uletay.activity.pushURL") {
      configure(url, enabled: UserDefaults.standard.bool(forKey: "uletay.activity.pushEnabled"))
    }
  }

  func observeCurrentActivities() {
    for activity in Activity<FestivalActivityAttributes>.activities where observers[activity.id] == nil && activity.activityState != .ended && activity.activityState != .dismissed {
      observers[activity.id] = Task { [weak self] in
        for await _ in activity.pushTokenUpdates { if Task.isCancelled { return }; await self?.changed() }
      }
      stateObservers[activity.id] = Task { [weak self] in
        for await state in activity.activityStateUpdates {
          if Task.isCancelled { return }
          await self?.changed()
          if state == .ended || state == .dismissed { await self?.stopObserving(activity.id); return }
        }
      }
    }
    let ids = Set(Activity<FestivalActivityAttributes>.activities.map(\.id))
    for id in Array(observers.keys) where !ids.contains(id) { stopObserving(id) }
  }
  private func stopObserving(_ id: String) {
    observers.removeValue(forKey: id)?.cancel(); stateObservers.removeValue(forKey: id)?.cancel()
  }

  private func changed() { retryAfter = .distantPast; flush() }
  private func environment() -> String {
    if let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
       let data = try? Data(contentsOf: url) {
      let profile = String(decoding: data, as: UTF8.self)
      if profile.range(of: #"<key>aps-environment</key>\s*<string>development</string>"#, options: .regularExpression) != nil { return "sandbox" }
    }
    #if DEBUG
    return "sandbox"
    #else
    return "production"
    #endif
  }
  private func snapshot() -> [[String: String]] {
    guard enabled else { return [] }
    return Activity<FestivalActivityAttributes>.activities.compactMap { activity -> [String: String]? in
      guard activity.activityState != .ended && activity.activityState != .dismissed, let token = activity.pushToken else { return nil }
      return ["activityId": activity.id, "favoriteKey": activity.attributes.eventId,
       "pushToken": token.map { String(format: "%02x", $0) }.joined(), "environment": environment()]
    }.sorted { $0["activityId"]! < $1["activityId"]! }
  }

  // Network delivery lives in native code and never holds the JS sync promise.
  // A failed snapshot is retained by ActivityKit/UserDefaults and retried on the
  // next foreground sync; tokens/secrets are never included in diagnostic logs.
  func flush() {
    guard !sending, endpoint != nil, Date() >= retryAfter else { return }
    sending = true
    Task { await sendPending() }
  }
  private func sendPending() async {
    defer { sending = false }
    guard let endpoint else { return }
    do {
      if identity == nil { identity = try FestivalInstallation.load() }
      guard let identity else { return }
      for _ in 0..<4 {
        let activities = snapshot()
        let state: [String: Any] = ["enabled": enabled, "activities": activities]
        let signature = SHA256.hash(data: try JSONSerialization.data(withJSONObject: state, options: [.sortedKeys])).map { String(format: "%02x", $0) }.joined()
        if signature == acknowledged { return }
        revision += 1
        UserDefaults.standard.set(revision, forKey: "uletay.activity.pushRevision")
        let sentRevision = revision
        let payload: [String: Any] = ["installationId": identity.id, "secret": identity.secret, "revision": sentRevision,
          "enabled": enabled, "activities": activities]
        var request = URLRequest(url: endpoint, timeoutInterval: 10)
        request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let background = await MainActor.run { UIApplication.shared.beginBackgroundTask(withName: "FestivalActivityRegistration", expirationHandler: nil) }
        let response: (Data, URLResponse)
        do { response = try await URLSession.shared.data(for: request) }
        catch {
          await MainActor.run { if background != .invalid { UIApplication.shared.endBackgroundTask(background) } }
          throw error
        }
        await MainActor.run { if background != .invalid { UIApplication.shared.endBackgroundTask(background) } }
        guard (response.1 as? HTTPURLResponse)?.statusCode == 200 else { retryAfter = Date().addingTimeInterval(30); return }
        let answer = try JSONSerialization.jsonObject(with: response.0) as? [String: Any]
        if let serverRevision = answer?["revision"] as? Int, serverRevision > sentRevision, serverRevision < 9_000_000_000_000_000 {
          revision = max(revision, serverRevision)
          UserDefaults.standard.set(revision, forKey: "uletay.activity.pushRevision")
          continue // Keychain survives reinstall; rebase a reset local counter.
        }
        acknowledged = signature
        UserDefaults.standard.set(signature, forKey: "uletay.activity.pushAck")
        retryAfter = .distantPast
      }
    } catch { retryAfter = Date().addingTimeInterval(30) }
  }
}

public class FestivalActivityAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    Task { await FestivalActivityPush.shared.restore() }; return false
  }
  public func applicationDidBecomeActive(_ application: UIApplication) { Task { await FestivalActivityPush.shared.restore() } }
}
