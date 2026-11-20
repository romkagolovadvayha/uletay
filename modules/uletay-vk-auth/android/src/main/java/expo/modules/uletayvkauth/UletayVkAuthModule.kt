package expo.modules.uletayvkauth

import android.content.ComponentName
import android.content.pm.PackageManager
import androidx.lifecycle.LifecycleOwner
import com.vk.id.VKID
import com.vk.id.AccessToken
import com.vk.id.VKIDAuthFail
import com.vk.id.auth.AuthCodeData
import com.vk.id.auth.VKIDAuthCallback
import com.vk.id.auth.VKIDAuthParams
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UletayVkAuthModule : Module() {
  private var initialized = false
  private var pending: Promise? = null
  override fun definition() = ModuleDefinition {
    Name("UletayVkAuth")
    AsyncFunction("authorize") { state: String, challenge: String, promise: Promise ->
      val context = appContext.reactContext
      val owner = appContext.currentActivity as? LifecycleOwner
      if(context == null || owner == null) {
        promise.reject("VK_UNAVAILABLE", "Не удалось открыть VK. Попробуй ещё раз.", null)
      } else if(pending != null) {
        promise.reject("VK_PENDING", "Вход через VK уже открыт", null)
      } else try {
        val info=context.packageManager.getActivityInfo(ComponentName(context,"com.vk.id.internal.auth.AuthActivity"),PackageManager.GET_META_DATA)
        if(info.metaData.getString("VKIDClientSecret").isNullOrBlank()) {
          promise.reject("VK_CONFIGURATION", "Вход VK ID для Android ещё не настроен: нужен защищённый ключ приложения VK ID.", null)
        } else {
          if(!initialized){VKID.init(context.applicationContext);initialized=true}
          pending=promise
          VKID.instance.authorize(owner,object: VKIDAuthCallback {
            override fun onAuth(accessToken: AccessToken) {
              pending?.reject("VK_UNEXPECTED", "Не удалось подтвердить вход", null);pending=null
            }
            override fun onAuthCode(data: AuthCodeData,isCompletion: Boolean) {
              if(isCompletion){pending?.resolve(mapOf("code" to data.code,"deviceId" to data.deviceId));pending=null}
            }
            override fun onFail(fail: VKIDAuthFail) {
              pending?.reject("VK_AUTH", if(fail is VKIDAuthFail.Canceled) "cancel" else "Не удалось войти через VK. Попробуй ещё раз.",null);pending=null
            }
          },VKIDAuthParams {
            this.state=state
            this.codeChallenge=challenge
            scopes=emptySet()
            useOAuthProviderIfPossible=true
            theme=VKIDAuthParams.Theme.Dark
          })
        }
      } catch (_:Exception) {
        pending=null
        promise.reject("VK_AUTH", "Не удалось открыть VK. Проверь настройки VK ID.", null)
      }
    }.runOnQueue(Queues.MAIN)
    OnDestroy { pending?.reject("VK_CANCELED","cancel",null);pending=null }
  }
}
