const {
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
} = require('expo/config-plugins');

// SDK 57 still generates the non-optimizing ProGuard configuration. Keep this
// change in a config plugin so both local prebuild and EAS use the same setup.
module.exports = function withAndroidReleaseOptimization(config) {
  config = withProjectBuildGradle(config, (androidConfig) => {
    const gradle = androidConfig.modResults;
    if (gradle.language !== 'groovy') throw new Error('Expected Groovy Android build.gradle');
    const dependency = /classpath\(['"]com\.android\.tools\.build:gradle(?::[^'"]+)?['"]\)/;
    if (!dependency.test(gradle.contents)) throw new Error('Android Gradle plugin declaration not found');
    // AGP 9 requires a newer React Native/Expo major. AGP 8.13 supports the
    // same optimized resource shrinking pipeline with an explicit opt-in.
    gradle.contents = gradle.contents.replace(dependency, "classpath('com.android.tools.build:gradle:8.13.2')");
    return androidConfig;
  });

  config = withAppBuildGradle(config, (androidConfig) => {
    const gradle = androidConfig.modResults;
    if (gradle.language !== 'groovy') throw new Error('Expected Groovy Android app/build.gradle');
    gradle.contents = gradle.contents.replaceAll('proguard-android.txt', 'proguard-android-optimize.txt');
    if (!gradle.contents.includes('proguard-android-optimize.txt')) {
      throw new Error('Optimized ProGuard configuration not found');
    }
    return androidConfig;
  });

  return withGradleProperties(config, (androidConfig) => {
    const properties = {
      'edgeToEdgeEnabled': 'true',
      'android.enableMinifyInReleaseBuilds': 'true',
      'android.enableShrinkResourcesInReleaseBuilds': 'true',
      'android.enableR8.fullMode': 'true',
      'android.r8.optimizedResourceShrinking': 'true',
    };
    androidConfig.modResults = androidConfig.modResults.filter(
      (item) => item.type !== 'property' || !(item.key in properties),
    );
    for (const [key, value] of Object.entries(properties)) {
      androidConfig.modResults.push({ type: 'property', key, value });
    }
    return androidConfig;
  });
};
