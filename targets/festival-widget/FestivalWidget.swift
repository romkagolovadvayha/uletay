import SwiftUI
import WidgetKit

private let yellow=Color(red:1,green:0.855,blue:0)
private let muted=Color(red:0.78,green:0.70,blue:0.76)

struct FestivalEntry: TimelineEntry {
  let date: Date
  let data: FestivalWidgetData?
}
struct FestivalProvider: TimelineProvider {
  func placeholder(in context: Context) -> FestivalEntry { FestivalEntry(date:Date(),data:nil) }
  func getSnapshot(in context: Context,completion:@escaping(FestivalEntry)->Void) {
    Task { completion(FestivalEntry(date:Date(),data:await FestivalWidgetStore.load())) }
  }
  func getTimeline(in context: Context,completion:@escaping(Timeline<FestivalEntry>)->Void) {
    Task {
      let data=await FestivalWidgetStore.load(),now=Date()
      let entries=(data?.timelineDates(from:now) ?? [now]).map{FestivalEntry(date:$0,data:data)}
      completion(Timeline(entries:entries,policy:.after(now.addingTimeInterval(1800))))
    }
  }
}

struct FestivalWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: FestivalEntry
  private var small: Bool { family == .systemSmall }
  private var large: Bool { family == .systemLarge }
  private var phase: FestivalWidgetPhase { entry.data?.phase(at:entry.date) ?? .countdown }
  private var destination: URL { URL(string:phase == .festival ? "uletay://schedule" : "uletay://headliners")! }

  var body: some View {
    Group {
      if #available(iOS 17.0,*) {
        content.containerBackground(for:.widget) { backdrop }
      } else { content.padding(14).background(backdrop) }
    }
    .widgetURL(destination)
  }

  private var backdrop: some View {
    ZStack(alignment:.topTrailing) {
      LinearGradient(colors:[Color(red:0.34,green:0.025,blue:0.18),Color(red:0.09,green:0.035,blue:0.08)],startPoint:.topLeading,endPoint:.bottomTrailing)
      Rectangle().fill(yellow.opacity(0.10)).frame(width:110,height:400).rotationEffect(.degrees(32)).offset(x:90,y:-85)
    }.clipped()
  }
  private var content: some View {
    VStack(alignment:.leading,spacing:small ? 6 : 10) {
      HStack(spacing:5) {
        Text("УЛЕТАЙ").font(.custom("RobotoCondensed-Italic",size:small ? 19 : 22).weight(.black)).foregroundStyle(yellow)
        if let data=entry.data { Text(String(data.year)).font(.system(size:12,weight:.bold)).foregroundStyle(muted) }
        Spacer(minLength:0)
        if !small { weather(compact:true) }
      }
      if let data=entry.data {
        switch phase {
        case .countdown: countdown(data)
        case .festival: performanceContent(data)
        case .finished:
          Spacer(minLength:0)
          Text("ДО НОВОЙ\nВСТРЕЧИ").font(.system(size:small ? 22 : 30,weight:.black).italic()).foregroundStyle(.white)
          Text("Следим за анонсами").font(.system(size:11)).foregroundStyle(muted)
        }
      } else {
        Spacer(minLength:0)
        Text("ТВОЙ\nФЕСТИВАЛЬ").font(.system(size:small ? 23 : 30,weight:.black).italic()).foregroundStyle(.white)
        Text("Обновляем данные…").font(.system(size:11)).foregroundStyle(muted)
      }
      if small { Spacer(minLength:0); weather(compact:false) }
      if large {
        Spacer(minLength:0)
        HStack {
          Text(entry.data?.location ?? "Лагуново · Удмуртия").lineLimit(1)
          Spacer(minLength:4)
          Text("Расписание →").foregroundStyle(yellow)
        }.font(.system(size:10,weight:.medium)).foregroundStyle(muted)
      }
    }
  }

  @ViewBuilder private func countdown(_ data: FestivalWidgetData) -> some View {
    let days=data.daysRemaining(at:entry.date)
    if !large { Spacer(minLength:0) }
    Text("ДО ФЕСТИВАЛЯ").font(.system(size:small ? 10 : 12,weight:.bold)).tracking(1.0).foregroundStyle(muted)
    if days>1 {
      HStack(alignment:.firstTextBaseline,spacing:6) {
        Text(String(days)).font(.custom("RobotoCondensed-Italic",size:small ? 48 : 60).weight(.black)).monospacedDigit().foregroundStyle(yellow)
        Text(dayWord(days)).font(.system(size:small ? 12 : 15,weight:.medium)).foregroundStyle(.white)
      }.minimumScaleFactor(0.65).lineLimit(1)
    } else {
      Text(timerInterval:entry.date...data.startAt,countsDown:true,showsHours:true)
        .font(.system(size:small ? 25 : 40,weight:.black,design:.rounded)).monospacedDigit().foregroundStyle(yellow).minimumScaleFactor(0.65)
    }
    Text("Увидимся \(festivalDate(data.startAt))").font(.system(size:small ? 10 : 12,weight:.medium)).foregroundStyle(.white).lineLimit(1)
    if large {
      Divider().overlay(muted.opacity(0.25)).padding(.vertical,4)
      if data.performances.isEmpty {
        Text("КТО ПРИЕДЕТ?").font(.system(size:20,weight:.black).italic()).foregroundStyle(.white)
        Text("Смотри участников в лайн-апе").font(.system(size:13)).foregroundStyle(muted)
      } else {
        Text("ПЕРВЫМИ НА СЦЕНЕ").font(.system(size:11,weight:.bold)).foregroundStyle(muted)
        ForEach(Array(data.next(at:entry.date).prefix(2))) { row in performance(row,live:false) }
      }
    }
  }

  @ViewBuilder private func performanceContent(_ data: FestivalWidgetData) -> some View {
    let current=data.current(at:entry.date),next=data.next(at:entry.date)
    if !small { Spacer(minLength:0) }
    if let first=current.first {
      Text("СЕЙЧАС НА СЦЕНЕ").font(.system(size:10,weight:.bold)).tracking(0.6).foregroundStyle(yellow)
      ForEach(Array(current.prefix(large ? 3 : 1))) { row in performance(row,live:true) }
      if small { Text(first.stage).font(.system(size:10)).foregroundStyle(muted).lineLimit(1) }
    } else {
      Text(next.isEmpty ? "МЕЖДУ ВЫСТУПЛЕНИЯМИ" : "СКОРО НА СЦЕНЕ")
        .font(.system(size:10,weight:.bold)).foregroundStyle(yellow).lineLimit(2)
      if current.isEmpty && next.isEmpty {
        Text("Расписание скоро").font(.system(size:small ? 17 : 21,weight:.bold)).foregroundStyle(.white)
      }
    }
    if let first=next.first {
      if !small {
        Divider().overlay(muted.opacity(0.25))
        Text("ДАЛЕЕ").font(.system(size:10,weight:.bold)).foregroundStyle(muted)
        ForEach(Array(next.prefix(large ? 3 : 1))) { row in performance(row,live:false) }
      } else if current.isEmpty { performance(first,live:false) }
      else { Text("Далее: \(first.artist) · \(clock(first.startAt))").font(.system(size:10,weight:.medium)).foregroundStyle(muted).lineLimit(2) }
    }
    if !small { Spacer(minLength:0) }
  }

  private func performance(_ row: FestivalPerformance,live: Bool) -> some View {
    VStack(alignment:.leading,spacing:2) {
      Text(row.artist).font(.system(size:small ? 19 : large ? 21 : 19,weight:.black).italic()).foregroundStyle(.white).lineLimit(small ? 2 : 1).minimumScaleFactor(0.75)
      if !small || !live {
        Text("\(clock(row.startAt))–\(clock(row.endAt)) · \(row.stage)")
          .font(.system(size:10,weight:.medium)).foregroundStyle(live ? yellow : muted).lineLimit(1)
      }
    }
  }
  @ViewBuilder private func weather(compact: Bool) -> some View {
    if let weather=entry.data?.weather {
      HStack(spacing:5) {
        Image(systemName:weather.symbol).symbolRenderingMode(.multicolor).font(.system(size:compact ? 17 : 19))
        Text(weather.isCurrent(at:entry.date) ? weather.degrees : "—°").font(.system(size:compact ? 19 : 22,weight:.bold)).foregroundStyle(.white)
        if !compact { Text(weather.isCurrent(at:entry.date) ? "Лагуново" : "Нет свежих данных").font(.system(size:9)).foregroundStyle(muted).lineLimit(1) }
      }.accessibilityLabel(weather.isCurrent(at:entry.date) ? "Погода в Лагуново: \(weather.degrees)" : "Погода обновляется")
    } else if !compact { Text("Погода обновляется").font(.system(size:10)).foregroundStyle(muted) }
  }
  private func dayWord(_ days: Int) -> String {
    if (11...14).contains(days%100) { return "дней" }
    return days%10==1 ? "день" : (2...4).contains(days%10) ? "дня" : "дней"
  }
  private func clock(_ date: Date) -> String {
    let f=DateFormatter();f.locale=Locale(identifier:"ru_RU");f.timeZone=TimeZone(identifier:"Europe/Samara");f.dateFormat="HH:mm";return f.string(from:date)
  }
  private func festivalDate(_ date: Date) -> String {
    let f=DateFormatter();f.locale=Locale(identifier:"ru_RU");f.timeZone=TimeZone(identifier:"Europe/Samara");f.dateFormat="d MMMM";return f.string(from:date)
  }
}

struct UletayFestivalWidget: Widget {
  let kind="UletayFestival"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind:kind,provider:FestivalProvider()) { entry in FestivalWidgetView(entry:entry) }
      .configurationDisplayName("Улетай рядом")
      .description("Таймер до фестиваля, погода в Лагуново и текущие и следующие выступления.")
      .supportedFamilies([.systemSmall,.systemMedium,.systemLarge])
  }
}

@main
struct UletayWidgetBundle: WidgetBundle {
  var body: some Widget {
    UletayFestivalWidget()
    FestivalLiveActivity()
  }
}
