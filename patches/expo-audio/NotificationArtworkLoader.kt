package expo.modules.audio.service

import android.content.Context
import android.graphics.Bitmap
import com.bumptech.glide.Glide
import kotlinx.coroutines.runInterruptible
import java.net.URL
import java.util.concurrent.TimeUnit

/** Loads bounded notification artwork without retaining a Glide-owned bitmap. */
internal object NotificationArtworkLoader {
  suspend fun load(context: Context, url: URL): Bitmap? = runInterruptible {
    val requests = Glide.with(context.applicationContext)
    val target = requests.asBitmap()
      .load(url.toString())
      .fitCenter()
      .disallowHardwareConfig()
      .submit(512, 512)

    try {
      // Notifications outlive the request. Copy before clear returns the original
      // to Glide's pool; the owned ARGB bitmap is at most 1 MiB.
      target.get(15, TimeUnit.SECONDS).copy(Bitmap.Config.ARGB_8888, false)
    } finally {
      // Also runs on timeout, failure and coroutine cancellation (which interrupts get).
      requests.clear(target)
    }
  }
}
