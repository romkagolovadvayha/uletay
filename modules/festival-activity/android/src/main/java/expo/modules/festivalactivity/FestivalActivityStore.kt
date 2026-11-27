package expo.modules.festivalactivity

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

internal object FestivalActivityStore {
  const val DISMISS = "expo.modules.festivalactivity.DISMISS"
  const val NOTIFICATION_ID = 74027
  private const val CHANNEL = "festival-live"
  private const val LEAD = 600_000L
  private const val PREFS = "uletay_festival_activity"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun alarmIntent(context: Context) = PendingIntent.getBroadcast(context, 74028,
    Intent(context, FestivalActivityReceiver::class.java).setAction("expo.modules.festivalactivity.REFRESH"),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  @Synchronized fun sync(context: Context, json: String) {
    val events = JSONArray(json)
    // Keep dismissal decisions while an event remains in the user's favorites.
    val ids = (0 until events.length()).map { events.getJSONObject(it).getString("id") }.toSet()
    val dismissed = prefs(context).getStringSet("dismissed", emptySet())!!.intersect(ids)
    prefs(context).edit().putString("events", events.toString()).putStringSet("dismissed", dismissed).commit()
    refresh(context)
  }

  @Synchronized fun dismiss(context: Context, id: String) {
    val hidden = prefs(context).getStringSet("dismissed", emptySet())!!.toMutableSet()
    hidden.add(id)
    prefs(context).edit().putStringSet("dismissed", hidden).commit()
  }

  internal fun select(events: List<JSONObject>, dismissed: Set<String>, now: Long): JSONObject? =
    events.filter { it.getString("id") !in dismissed && it.getLong("endAt") > now && it.getLong("startAt") - LEAD <= now }
      .sortedWith(compareBy<JSONObject> { if (it.getLong("startAt") <= now) 0 else 1 }.thenBy { it.getLong("startAt") }.thenBy { it.getString("id") })
      .firstOrNull()

  @Synchronized fun refresh(context: Context) {
    val saved = prefs(context)
    val rows = runCatching { JSONArray(saved.getString("events", "[]")) }.getOrElse { JSONArray() }
    val events = (0 until rows.length()).mapNotNull { rows.optJSONObject(it) }
    val dismissed = saved.getStringSet("dismissed", emptySet())!!
    val now = System.currentTimeMillis()
    val manager = context.getSystemService(NotificationManager::class.java)
    val alarms = context.getSystemService(AlarmManager::class.java)
    val pending = alarmIntent(context)
    alarms.cancel(pending)
    val allowed = manager.areNotificationsEnabled() && (Build.VERSION.SDK_INT < 33 ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
    if (!allowed) { manager.cancel(NOTIFICATION_ID); return }
    val active = select(events, dismissed, now)
    if (active == null) manager.cancel(NOTIFICATION_ID) else show(context, manager, active, now)
    val next = events.filter { it.getString("id") !in dismissed }.flatMap {
      listOf(it.getLong("startAt") - LEAD, it.getLong("startAt"), it.getLong("endAt"))
    }.filter { it > now }.minOrNull() ?: return
    // Inexact fallback works without asking for special-alarm access.
    try {
      if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending)
      else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending)
    } catch (_: SecurityException) { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending) }
  }

  private fun open(context: Context, path: String, code: Int): PendingIntent {
    val launch = Intent(Intent.ACTION_VIEW, Uri.parse("uletay://" + path.removePrefix("/")))
      .setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, code, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun show(context: Context, manager: NotificationManager, event: JSONObject, now: Long) {
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, "Выступления на экране блокировки", NotificationManager.IMPORTANCE_LOW)
      channel.description = "Таймер и сцена избранного события. Карточку можно скрыть."
      channel.setSound(null, null)
      manager.createNotificationChannel(channel)
    }
    val start = event.getLong("startAt")
    val end = event.getLong("endAt")
    val live = now >= start
    val autograph = event.getString("kind") == "autograph"
    val status = if (live) { if (autograph) "Автограф-сессия идёт" else "Сейчас на сцене" }
      else if (autograph) "Скоро автограф-сессия" else "Скоро на сцене"
    val details = "${event.getString("stage")} · ${event.getString("timeLabel")}"
    val hide = PendingIntent.getBroadcast(context, 74029, Intent(context, FestivalActivityReceiver::class.java)
      .setAction(DISMISS).putExtra("eventId", event.getString("id")), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val notification = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(R.drawable.ic_festival_activity)
      .setContentTitle(event.getString("artist"))
      .setContentText("$status · $details")
      .setStyle(NotificationCompat.BigTextStyle().bigText("$status\n$details\n${if (live) "До окончания" else "До начала"}"))
      .setSubText("Улетай · Твоё расписание")
      .setColor(Color.rgb(255, 209, 0))
      .setWhen(if (live) end else start).setShowWhen(true)
      .setUsesChronometer(true).setChronometerCountDown(true)
      .setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_EVENT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setTimeoutAfter(end - now)
      .setContentIntent(open(context, event.getString("url"), 74030))
      .setDeleteIntent(hide)
      .addAction(0, "Расписание", open(context, event.getString("url"), 74030))
      .addAction(0, "Карта", open(context, "/map", 74031))
      .addAction(0, "Скрыть", hide)
      .setRequestPromotedOngoing(true)
      .build()
    try { manager.notify(NOTIFICATION_ID, notification) } catch (_: SecurityException) { /* Permission revoked during refresh. */ }
  }
}
