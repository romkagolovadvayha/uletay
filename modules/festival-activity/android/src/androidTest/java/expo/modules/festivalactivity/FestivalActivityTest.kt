package expo.modules.festivalactivity

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FestivalActivityTest {
  private val context: Context get() = InstrumentationRegistry.getInstrumentation().targetContext
  private fun event(id: String, start: Long, end: Long) = JSONObject().apply {
    put("id", id); put("artist", "Кипелов"); put("stage", "Южная сцена"); put("kind", "performance")
    put("startAt", start); put("endAt", end); put("timeLabel", "18:00–19:00"); put("url", "/schedule/live/test")
  }
  @After fun clear() { FestivalActivityStore.sync(context, "[]") }
  private fun awaitCard(visible: Boolean) {
    val manager = context.getSystemService(NotificationManager::class.java)
    val deadline = System.currentTimeMillis() + 2500
    while (System.currentTimeMillis() < deadline && manager.activeNotifications.any { it.id == FestivalActivityStore.NOTIFICATION_ID } != visible) Thread.sleep(25)
    assertEquals("System notification state", visible, manager.activeNotifications.any { it.id == FestivalActivityStore.NOTIFICATION_ID })
  }

  @Test fun selectionHandlesBoundariesAndOverlap() {
    val now = System.currentTimeMillis()
    val future = event("future", now + 600_001, now + 3_600_000)
    assertNull(FestivalActivityStore.select(listOf(future), emptySet(), now))
    val soon = event("soon", now + 600_000, now + 3_600_000)
    assertEquals("soon", FestivalActivityStore.select(listOf(soon), emptySet(), now)?.getString("id"))
    val live = event("live", now - 1000, now + 1000)
    assertEquals("live", FestivalActivityStore.select(listOf(soon, live), emptySet(), now)?.getString("id"))
    assertEquals("soon", FestivalActivityStore.select(listOf(soon, live), setOf("live"), now)?.getString("id"))
    assertNull(FestivalActivityStore.select(listOf(live), emptySet(), now + 1000))
  }

  @Test fun notificationLifecycleAndDismissalSurviveSync() {
    val now = System.currentTimeMillis()
    val row = event("lifecycle", now + 120_000, now + 600_000)
    val json = JSONArray().put(row).toString()
    FestivalActivityStore.sync(context, json)
    awaitCard(true)
    val manager = context.getSystemService(NotificationManager::class.java)
    val active = manager.activeNotifications.single { it.id == FestivalActivityStore.NOTIFICATION_ID }.notification
    assertEquals("Кипелов", active.extras.getString(Notification.EXTRA_TITLE))
    assertTrue(active.flags and Notification.FLAG_ONGOING_EVENT != 0)
    assertTrue(active.extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER))
    assertTrue(active.extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN))
    assertNotNull(active.contentIntent)
    assertEquals(listOf("Расписание", "Карта", "Скрыть"), active.actions.map { it.title.toString() })
    active.actions.last().actionIntent.send()
    awaitCard(false)
    FestivalActivityStore.sync(context, json)
    awaitCard(false)
    FestivalActivityStore.sync(context, "[]")
    FestivalActivityStore.sync(context, json)
    awaitCard(true)
    FestivalActivityStore.sync(context, "[]")
    awaitCard(false)
  }

  @Test fun liveEventShowsCurrentStatusAndEndCountdown() {
    val now = System.currentTimeMillis()
    FestivalActivityStore.sync(context, JSONArray().put(event("live-test", now - 30_000, now + 30_000)).toString())
    val notification = context.getSystemService(NotificationManager::class.java).activeNotifications
      .single { it.id == FestivalActivityStore.NOTIFICATION_ID }.notification
    assertTrue(notification.extras.getCharSequence(Notification.EXTRA_TEXT).toString().contains("Сейчас на сцене"))
    assertTrue(notification.`when` > now)
    assertTrue(notification.timeoutAfter <= 30_000)
  }

  @Test fun scheduledReceiverTransitionsWithoutJavaScript() {
    val now = System.currentTimeMillis()
    FestivalActivityStore.sync(context, JSONArray().put(event("alarm-test", now + 3000, now + 7000)).toString())
    val manager = context.getSystemService(NotificationManager::class.java)
    assertTrue(manager.activeNotifications.single { it.id == FestivalActivityStore.NOTIFICATION_ID }.notification.extras
      .getCharSequence(Notification.EXTRA_TEXT).toString().contains("Скоро на сцене"))
    val deadline = now + 6500
    var switched = false
    while (System.currentTimeMillis() < deadline && !switched) {
      Thread.sleep(100)
      switched = manager.activeNotifications.any { it.id == FestivalActivityStore.NOTIFICATION_ID &&
        it.notification.extras.getCharSequence(Notification.EXTRA_TEXT).toString().contains("Сейчас на сцене") }
    }
    assertTrue("Alarm receiver must switch the card without a JS process", switched)
    while (System.currentTimeMillis() < now + 8500 && manager.activeNotifications.any { it.id == FestivalActivityStore.NOTIFICATION_ID }) Thread.sleep(100)
    assertFalse("Finished event must disappear", manager.activeNotifications.any { it.id == FestivalActivityStore.NOTIFICATION_ID })
  }
}
