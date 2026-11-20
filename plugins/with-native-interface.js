const {withAppBuildGradle}=require('expo/config-plugins');
// Preserve any old generated web files on disk, but never package that UI in native APKs.
module.exports=config=>withAppBuildGradle(config,result=>{
  if(!result.modResults.contents.includes(':!www.bundle'))result.modResults.contents=result.modResults.contents.replace(/ignoreAssetsPattern '([^']+)'/,(_match,patterns)=>`ignoreAssetsPattern '${patterns}:!www.bundle'`);
  return result;
});
