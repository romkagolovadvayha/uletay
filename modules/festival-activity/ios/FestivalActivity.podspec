Pod::Spec.new do |s|
  s.name = 'FestivalActivity'
  s.version = '1.0.0'
  s.summary = 'Lock Screen performance tracking for Uletay'
  s.description = 'Local ActivityKit integration for the festival schedule.'
  s.license = { :type => 'MIT' }
  s.author = 'Uletay'
  s.homepage = 'https://uletayapp.ru'
  s.source = { :git => '' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit', 'Security', 'CryptoKit', 'UIKit'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
