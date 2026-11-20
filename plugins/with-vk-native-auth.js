const {withProjectBuildGradle,withAppBuildGradle}=require('expo/config-plugins');
const placeholders=`
        def vkNativeProperties = new Properties()
        def vkNativeFile = rootProject.file('../credentials/vk-native.properties')
        if (vkNativeFile.exists()) vkNativeFile.withInputStream { vkNativeProperties.load(it) }
        def vkNativeId = System.getenv('VK_NATIVE_APP_ID') ?: vkNativeProperties.getProperty('clientId', '54911793')
        manifestPlaceholders += [VKIDClientID: vkNativeId, VKIDClientSecret: System.getenv('VK_NATIVE_CLIENT_SECRET') ?: vkNativeProperties.getProperty('clientSecret', ''), VKIDRedirectHost: 'vk.ru', VKIDRedirectScheme: 'vk' + vkNativeId]
`;
module.exports=config=>{
 config=withProjectBuildGradle(config,result=>{
  const repo="maven { url 'https://nexus-external.vkteam.ru/repository/maven/' }";
  if(!result.modResults.contents.includes('nexus-external.vkteam.ru'))result.modResults.contents=result.modResults.contents.replace('allprojects {\n  repositories {',`allprojects {\n  repositories {\n    ${repo}`);
  return result;
 });
 return withAppBuildGradle(config,result=>{if(!result.modResults.contents.includes('def vkNativeProperties'))result.modResults.contents=result.modResults.contents.replace('defaultConfig {','defaultConfig {'+placeholders);return result;});
};
