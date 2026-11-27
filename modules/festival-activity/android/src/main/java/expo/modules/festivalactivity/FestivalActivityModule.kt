package expo.modules.festivalactivity

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FestivalActivityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FestivalActivity")
    AsyncFunction("syncEvents") { json: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      FestivalActivityStore.sync(context, json)
    }
  }
}
