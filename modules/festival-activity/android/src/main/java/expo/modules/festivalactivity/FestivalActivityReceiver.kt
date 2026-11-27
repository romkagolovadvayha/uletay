package expo.modules.festivalactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class FestivalActivityReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == FestivalActivityStore.DISMISS) {
      intent.getStringExtra("eventId")?.let { FestivalActivityStore.dismiss(context, it) }
    }
    FestivalActivityStore.refresh(context)
  }
}
