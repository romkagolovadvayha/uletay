package expo.modules.audio.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import com.bumptech.glide.Glide
import java.io.ByteArrayOutputStream
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import okio.Buffer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], manifest = Config.NONE)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class NotificationArtworkLoaderTest {
  private lateinit var context: Context
  private lateinit var server: MockWebServer

  @Before fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    server = MockWebServer()
    server.start()
  }

  @After fun tearDown() {
    server.shutdown()
    Glide.tearDown()
  }

  private fun url(path: String): URL = server.url(path).toUrl()

  private fun serveImage(width: Int, height: Int) {
    val source = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    source.eraseColor(Color.MAGENTA)
    val output = ByteArrayOutputStream()
    source.compress(Bitmap.CompressFormat.PNG, 100, output)
    source.recycle()
    server.enqueue(MockResponse().setHeader("Content-Type", "image/png")
      .setBody(Buffer().write(output.toByteArray())))
  }

  @Test fun boundsLargeLandscapeAndPortraitAndKeepsOwnedPixels() = runBlocking {
    for ((width, height) in listOf(4096 to 3072, 3072 to 4096)) {
      val path = "/image-$width.png"
      serveImage(width, height)
      val bitmap = withContext(Dispatchers.IO) {
        NotificationArtworkLoader.load(context, url(path))
      }!!
      assertTrue("Artwork fits 512 px", bitmap.width <= 512 && bitmap.height <= 512)
      assertEquals(512, maxOf(bitmap.width, bitmap.height))
      assertTrue("Owned pixels fit 1 MiB", bitmap.allocationByteCount <= 1024 * 1024)
      assertEquals(width.toDouble() / height, bitmap.width.toDouble() / bitmap.height, 0.01)
      // Releasing Glide's resources must not recycle the bitmap held by a notification.
      Glide.get(context).clearMemory()
      assertFalse(bitmap.isRecycled)
      assertEquals(Color.MAGENTA, bitmap.getPixel(bitmap.width / 2, bitmap.height / 2))
      bitmap.recycle()
    }
  }

  @Test fun reusesCachedDownload() = runBlocking {
    serveImage(1200, 800)
    repeat(2) {
      withContext(Dispatchers.IO) { NotificationArtworkLoader.load(context, url("/cached.png")) }!!.recycle()
    }
    assertEquals("The second notification reuses Glide's cache", 1, server.requestCount)
  }

  @Test fun cancellationDoesNotWaitForSlowServer() = runBlocking {
    server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE))
    var delivered = false
    val job = launch(Dispatchers.IO) {
      NotificationArtworkLoader.load(context, url("/slow.png"))
      delivered = true
    }
    assertNotNull(server.takeRequest(10, TimeUnit.SECONDS))
    withTimeout(2000) { job.cancelAndJoin() }
    assertFalse("Cancelled artwork must not be delivered", delivered)
  }

  @Test fun failedDownloadPropagatesToServiceFallback(): Unit = runBlocking {
    server.enqueue(MockResponse().setResponseCode(404))
    val failure = withContext(Dispatchers.IO) {
      runCatching { NotificationArtworkLoader.load(context, url("/missing.png")) }.exceptionOrNull()
    }
    assertNotNull("AudioControlsService catches this and retains playback without artwork", failure)
  }
}
