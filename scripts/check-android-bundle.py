"""Inspect the actual release AAB, including R8's embedded optimization report.

Usage: python scripts/check-android-bundle.py app.aab report.json [--require-optimized]
Only the Python standard library is required.
"""
import hashlib
import json
import pathlib
import struct
import sys
import zipfile


def window_color_references(data):
    """Read DEX method references, without mistaking arbitrary strings for APIs."""
    assert data[:4] == b'dex\n', 'Expected a DEX file'
    string_count, string_offset = struct.unpack_from('<II', data, 56)
    type_count, type_offset = struct.unpack_from('<II', data, 64)
    method_count, method_offset = struct.unpack_from('<II', data, 88)
    strings = []
    for index in range(string_count):
        offset = struct.unpack_from('<I', data, string_offset + 4 * index)[0]
        while data[offset] & 128:
            offset += 1
        offset += 1
        strings.append(data[offset:data.index(b'\0', offset)].decode('utf-8', errors='replace'))
    types = [strings[struct.unpack_from('<I', data, type_offset + 4 * i)[0]] for i in range(type_count)]
    references = set()
    for index in range(method_count):
        class_index, _, name_index = struct.unpack_from('<HHI', data, method_offset + 8 * index)
        if types[class_index] == 'Landroid/view/Window;' and strings[name_index] in {
            'getStatusBarColor', 'setStatusBarColor', 'setNavigationBarColor',
        }:
            references.add(strings[name_index])
    return sorted(references)


binary = pathlib.Path(sys.argv[1])
report_path = pathlib.Path(sys.argv[2])
with zipfile.ZipFile(binary) as archive:
    metadata = archive.read('BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties').decode()
    agp = next(line.split('=', 1)[1] for line in metadata.splitlines() if line.startswith('androidGradlePluginVersion='))
    r8 = json.loads(archive.read('BUNDLE-METADATA/com.android.tools/r8.json'))
    config = json.loads(archive.read('base/assets/app.config'))
    dex = [item for item in archive.infolist() if item.filename.endswith('.dex')]
    references = sorted({ref for item in dex for ref in window_color_references(archive.read(item))})
    result = {
        'binary': str(binary.resolve()),
        'sha256': hashlib.file_digest(binary.open('rb'), 'sha256').hexdigest(),
        'bytes': binary.stat().st_size,
        'version': config['version'],
        'agp': agp,
        'r8': r8['version'],
        'optimizationEnabled': r8['options']['isOptimizationsEnabled'],
        'shrinkingEnabled': r8['options']['isShrinkingEnabled'],
        'fullMode': not r8['options']['isProGuardCompatibilityModeEnabled'],
        'optimizedResourceShrinking': r8['resourceOptimization']['isOptimizedShrinkingEnabled'],
        'minApiLevel': int(r8['options']['minApiLevel']),
        'dexBytes': sum(item.file_size for item in dex),
        'hasMapping': 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map' in archive.namelist(),
        # Compatibility code inside dependencies can still trigger Play's static warning.
        # Do not claim those references are gone merely because layout tests pass.
        'legacyWindowApiReferences': references,
    }
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
if '--require-optimized' in sys.argv:
    for key in ['optimizationEnabled', 'shrinkingEnabled', 'fullMode', 'optimizedResourceShrinking', 'hasMapping']:
        assert result[key], f'{key} is not enabled in the compiled bundle'
    assert result['minApiLevel'] == 24, 'Do not drop support for older Android devices'
